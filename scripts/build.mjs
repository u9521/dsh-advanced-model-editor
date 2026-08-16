#!/usr/bin/env node
/**
 * Build script, ported from dsh-conversation-share (scripts/build.mjs).
 *
 * Primary path — requires a DSH source checkout (the official
 * deepseek-ai/deepseek-harness repository or a snapshot directory):
 *   1. resolve the checkout via $DSH_CHECKOUT or the `dsh` launcher on PATH
 *   2. symlink the checkout's node_modules into this directory and link the
 *      workspace packages this plugin depends on into node_modules/@deepseek-ai
 *   3. run `tsc -p tsconfig.json` (type check + emit lib/types), then
 *      `tsdown -c tsdown.config.mjs` (lib/index.js + lib/client.js)
 *   4. remove the symlinked node_modules again
 *
 * Fallback path — DSH installed as a plain npm package (no source checkout):
 *   link the installed DSH's node_modules entries (every @deepseek-ai/* package,
 *   react, @types/node) into this directory additively, then build with the
 *   project's own tsc + esbuild. Produces the same lib/ artifacts: tsc emits
 *   lib/types and the node half, esbuild wraps the browser half into the same
 *   window.__ModuleLoader__.load handoff the tsdown preset emits.
 *
 * `--check` runs tsc --noEmit instead of emitting and bundling.
 */
import { spawnSync } from 'node:child_process'
import {
  existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync,
  renameSync, rmSync, symlinkSync, writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const CHECKOUT_MARKER = join('packages', 'client', 'tsdown.client.ts')
const PACKAGE_ID = '@local/dsh-advanced-model-editor'
const CHECK_ONLY = process.argv.includes('--check')

/**
 * Resolve the build environment.
 * @returns {Promise<{ kind: 'checkout', dir: string } | { kind: 'installed', dir: string }>}
 */
async function resolveEnvironment() {
  if (process.env.DSH_CHECKOUT !== undefined && process.env.DSH_CHECKOUT !== '') {
    const dir = resolve(process.env.DSH_CHECKOUT)
    if (!existsSync(join(dir, CHECKOUT_MARKER))) {
      throw new Error(
        `DSH_CHECKOUT=${dir} is not a DSH source checkout (missing ${CHECKOUT_MARKER}); `
        + 'point it at a deepseek-ai/deepseek-harness clone with node_modules installed',
      )
    }
    return { kind: 'checkout', dir }
  }
  const which = spawnSync('command -v dsh', { shell: true, encoding: 'utf8' })
  const launcher = which.stdout.trim()
  if (launcher === '') {
    throw new Error(
      'Cannot find DSH. Set DSH_CHECKOUT=/path/to/dsh-checkout (a deepseek-ai/deepseek-harness '
      + 'clone with node_modules installed), or make the `dsh` launcher available on PATH.',
    )
  }
  const launcherReal = realpathSync(launcher)
  // Walk up from the launcher looking for a source checkout.
  let directory = dirname(launcherReal)
  for (let depth = 0; depth < 6; depth += 1) {
    if (existsSync(join(directory, CHECKOUT_MARKER))) return { kind: 'checkout', dir: directory }
    directory = dirname(directory)
  }
  // No source checkout: fall back to the installed DSH package itself
  // (…/node_modules/@deepseek-ai/dsh), whose node_modules carries every
  // @deepseek-ai/* runtime package, react and @types/node.
  const installed = dirname(dirname(launcherReal))
  if (existsSync(join(installed, 'package.json'))) return { kind: 'installed', dir: installed }
  throw new Error(`No DSH source checkout above ${launcherReal} and no installed DSH package found; set DSH_CHECKOUT`)
}

function findWorkspacePackage(checkout, name) {
  const packages = join(checkout, 'packages')
  for (const group of readdirSync(packages, { withFileTypes: true })) {
    if (!group.isDirectory()) continue
    const groupDirectory = join(packages, group.name)
    for (const entry of readdirSync(groupDirectory, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const packageFile = join(groupDirectory, entry.name, 'package.json')
      if (!existsSync(packageFile)) continue
      try {
        if (JSON.parse(readFileSync(packageFile, 'utf8')).name === name) return join(groupDirectory, entry.name)
      } catch {
        // Ignore directories without valid package metadata.
      }
    }
  }
  return undefined
}

/** Swap the project's node_modules for the checkout's, preserving the local one. */
function linkCheckoutDeps(checkout) {
  const nodeModules = join(root, 'node_modules')
  const localModules = join(root, 'node_modules.local')
  let preserved = false
  if (existsSync(nodeModules) && !lstatSync(nodeModules).isSymbolicLink()) {
    rmSync(localModules, { recursive: true, force: true })
    renameSync(nodeModules, localModules)
    preserved = true
  }
  rmSync(nodeModules, { recursive: true, force: true })
  symlinkSync(join(checkout, 'node_modules'), nodeModules, 'dir')
  const linkMissing = (sourceRoot, relative) => {
    const target = join(nodeModules, relative)
    if (existsSync(target)) return
    const source = join(sourceRoot, relative)
    if (!existsSync(source)) return
    mkdirSync(dirname(target), { recursive: true })
    symlinkSync(source, target, 'dir')
  }
  try {
    const scope = join(nodeModules, '@deepseek-ai')
    mkdirSync(scope, { recursive: true })
    // The framework peer is rescoped into @deepseek-ai (cordis -> @deepseek-ai/cordis):
    // link the vendored source under the scoped name so tsc/tsdown resolve it.
    const cordisTarget = join(scope, 'cordis')
    if (!existsSync(cordisTarget)) symlinkSync(join(checkout, 'vendor', 'cordis'), cordisTarget, 'dir')
    for (const name of [
      '@deepseek-ai/dsh-client-runtime',
      '@deepseek-ai/dsh-client-ui-settings',
      '@deepseek-ai/dsh-client-ui-primitives',
      '@deepseek-ai/dsh-client-locale',
      '@deepseek-ai/dsh-api-remotes',
    ]) {
      const target = join(scope, name.slice(name.lastIndexOf('/') + 1))
      if (existsSync(target)) continue
      const source = findWorkspacePackage(checkout, name)
      if (source === undefined) throw new Error(`DSH workspace package not found: ${name}`)
      symlinkSync(source, target, 'dir')
    }
    // pnpm keeps shared dependencies in the isolated virtual store rather
    // than the workspace root; this plugin's tsc run resolves imports by
    // walking up from this directory, so surface react and type roots at the
    // top level (prefer the checkout's own store, fall back to the preserved
    // local node_modules).
    const virtualStore = join(checkout, 'node_modules', '.pnpm', 'node_modules')
    for (const relative of ['react', '@types/react', '@types/node']) {
      linkMissing(virtualStore, relative)
      if (preserved) linkMissing(localModules, relative)
    }
  } catch (error) {
    rmSync(nodeModules, { recursive: true, force: true })
    if (preserved) renameSync(localModules, nodeModules)
    throw error
  }
  return () => {
    rmSync(nodeModules, { recursive: true, force: true })
    if (preserved) renameSync(localModules, nodeModules)
  }
}

/** Additively link the installed DSH's node_modules entries (no deletion). */
function linkInstalledDeps(installed) {
  const nodeModules = join(root, 'node_modules')
  const sourceModules = join(installed, 'node_modules')
  if (!existsSync(sourceModules)) {
    throw new Error(`Installed DSH package has no node_modules: ${sourceModules}`)
  }
  const added = []
  const scope = join(nodeModules, '@deepseek-ai')
  mkdirSync(scope, { recursive: true })
  for (const name of [
    'cordis',
    'dsh-client-runtime',
    'dsh-client-ui-settings',
    'dsh-client-ui-primitives',
    'dsh-client-locale',
    'dsh-api-remotes',
  ]) {
    const source = join(sourceModules, '@deepseek-ai', name)
    const target = join(scope, name)
    if (!existsSync(source)) throw new Error(`Installed DSH lacks @deepseek-ai/${name}`)
    if (existsSync(target)) continue
    symlinkSync(source, target, 'dir')
    added.push(target)
  }
  for (const [sub, name] of [['@types', 'node'], ['', 'react']]) {
    const source = join(sourceModules, sub, name)
    const target = join(nodeModules, sub, name)
    if (!existsSync(source)) continue
    if (existsSync(target)) continue
    mkdirSync(dirname(target), { recursive: true })
    symlinkSync(source, target, 'dir')
    added.push(target)
  }
  return () => {
    for (const target of added) rmSync(target, { recursive: true, force: true })
  }
}

/** Run a binary with cwd=root, inheriting stdio; exit the process on failure. */
function run(command, args, env = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...env },
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

/** Bundle the browser half with esbuild into the ModuleLoader handoff. */
async function bundleClient(esbuild) {
  const result = await esbuild.build({
    entryPoints: [join(root, 'src', 'client', 'index.ts')],
    bundle: true,
    format: 'cjs',
    platform: 'browser',
    target: 'es2020',
    write: false,
    external: ['react', '@deepseek-ai/dsh-client-ui-primitives'],
    logLevel: 'warning',
  })
  const code = result.outputFiles[0].text
  const bundle = [
    '// Generated by scripts/build.mjs (esbuild fallback) — do not edit by hand.',
    '// TypeScript sources live in src/client/.',
    `window.__ModuleLoader__.load({`,
    `  id: '${PACKAGE_ID}',`,
    `  factory: (require) => {`,
    `    const module = { exports: {} }`,
    indent(code, 4),
    `    return module.exports`,
    `  },`,
    `})`,
    '',
  ].join('\n')
  writeFileSync(join(root, 'lib', 'client.js'), bundle)
  console.log(`wrote lib/client.js (${bundle.length} bytes, esbuild bundle, single injection point)`)
}

/** Bundle the tsc-emitted node half into lib/index.js (mirrors the tsdown lib build). */
async function bundleNodeHalf(esbuild) {
  await esbuild.build({
    entryPoints: [join(root, 'lib', 'types', 'index.js')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'es2024',
    outfile: join(root, 'lib', 'index.js'),
    external: ['@deepseek-ai/*', 'react'],
    logLevel: 'warning',
  })
  console.log('wrote lib/index.js (esbuild bundle of lib/types/index.js)')
}

function indent(text, spaces) {
  const pad = ' '.repeat(spaces)
  return text.split('\n').map((line) => (line.length === 0 ? line : pad + line)).join('\n')
}

mkdirSync(join(root, 'lib'), { recursive: true })
const env = await resolveEnvironment()
let restore
if (env.kind === 'checkout') {
  restore = linkCheckoutDeps(env.dir)
} else {
  restore = linkInstalledDeps(env.dir)
}
try {
  if (env.kind === 'checkout') {
    const bin = join(env.dir, 'node_modules', '.bin')
    const args = ['-p', 'tsconfig.json']
    if (CHECK_ONLY) args.push('--noEmit', '--pretty', 'false')
    run(join(bin, 'tsc'), args, { DSH_CHECKOUT: env.dir })
    if (!CHECK_ONLY) run(join(bin, 'tsdown'), ['-c', 'tsdown.config.mjs'], { DSH_CHECKOUT: env.dir })
  } else {
    const tsc = join(root, 'node_modules', 'typescript', 'bin', 'tsc')
    if (!existsSync(tsc)) {
      throw new Error('No DSH source checkout and no project tsc; run `npm install` first')
    }
    const args = ['-p', 'tsconfig.json']
    if (CHECK_ONLY) args.push('--noEmit', '--pretty', 'false')
    run(process.execPath, [tsc, ...args])
    if (!CHECK_ONLY) {
      const esbuild = await import('esbuild')
      await bundleClient(esbuild)
      await bundleNodeHalf(esbuild)
    }
  }
} finally {
  restore()
}
