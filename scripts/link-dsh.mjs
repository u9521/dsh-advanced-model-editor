#!/usr/bin/env node
/**
 * Link the DSH runtime packages this project's build needs.
 *
 * Primary path — global DSH install: symlink the installed @deepseek-ai/dsh's
 * runtime packages (@deepseek-ai/dsh-client-*) and react into this project's
 * node_modules, so `tsc` resolves types against the exact versions the running
 * harness uses (mirrors the reference project dsh-subagent-custom-model).
 * pnpm never manages these links, so `pnpm install` does not remove them.
 *
 * Fallback path — no global DSH install: pull the five @deepseek-ai/dsh-client-*
 * packages from the configured npm registry and save them into devDependencies.
 * They are published in lockstep with dsh, so each is pinned to ^<version of
 * the latest @deepseek-ai/dsh release> (the same range the dsh package tree
 * declares). Types then track the registry release rather than a local
 * install; to switch back to a global install, remove the fallback deps and
 * re-run this script.
 *
 * The registry used is the configured one (pnpm/npm config, .npmrc), or the
 * one passed as `--registry <url>`. DSH_GLOBAL overrides where the global
 * install is looked up; when DSH_GLOBAL is set but unusable, the script fails
 * instead of silently falling back.
 */
import { spawnSync } from 'node:child_process'
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  symlinkSync,
  unlinkSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const argv = process.argv.slice(2)
const registryIndex = argv.indexOf('--registry')
const REGISTRY =
  registryIndex >= 0 && argv[registryIndex + 1] ? argv[registryIndex + 1] : ''

// Packages the build must resolve — symlinked from the global DSH install or
// installed from the registry: the five injected dsh.client packages.
const SCOPED = [
  'dsh-api-remotes',
  'dsh-client-locale',
  'dsh-client-runtime',
  'dsh-client-ui-primitives',
  'dsh-client-ui-settings',
]

/** Run a command with cwd=root, inheriting stdio; exit the process on failure. */
function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

/** pnpm args: an optional explicit registry, plus the project store convention. */
function pnpmArgs(extra) {
  const [command] = extra
  // --store-dir is an install-time option; other commands (e.g. view) reject it.
  const store = command === 'install' || command === 'add' ? storeArgs() : []
  return [...(REGISTRY ? ['--registry', REGISTRY] : []), ...store, ...extra]
}

/** Run a command with cwd=root; return stdout, throw on failure. */
function runCapture(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  })
  if (result.status !== 0) {
    const message = (result.stderr ?? '').trim() || (result.stdout ?? '').trim()
    throw new Error(
      `${command} ${args.join(' ')} failed (${result.status})${message ? `: ${message}` : ''}`,
    )
  }
  return result.stdout
}

/** Resolve the installed @deepseek-ai/dsh package directory. */
function resolveDshPackage() {
  if (process.env.DSH_GLOBAL !== undefined && process.env.DSH_GLOBAL !== '') {
    return process.env.DSH_GLOBAL
  }
  const which = spawnSync('command -v dsh', { shell: true, encoding: 'utf8' })
  const launcher = which.stdout.trim()
  if (launcher === '') {
    throw new Error(
      'Cannot find DSH. Install it globally (`npm install -g @deepseek-ai/dsh`), ' +
        'put the `dsh` launcher on PATH, or set DSH_GLOBAL=/path/to/@deepseek-ai/dsh',
    )
  }
  // Real path of the launcher, e.g. …/lib/node_modules/@deepseek-ai/dsh/lib/bin.js.
  const bin = realpathSync(launcher)
  let directory = dirname(bin)
  for (let depth = 0; depth < 8; depth += 1) {
    const candidate = join(directory, 'package.json')
    if (existsSync(candidate)) {
      const name = JSON.parse(readFileSync(candidate, 'utf8')).name
      if (name === '@deepseek-ai/dsh') return directory
    }
    directory = dirname(directory)
  }
  throw new Error(
    `No global @deepseek-ai/dsh package above ${bin}; set DSH_GLOBAL`,
  )
}

function link(source, target) {
  try {
    const stat = lstatSync(target)
    if (stat.isSymbolicLink()) {
      try {
        if (readlinkSync(target) === source) return false
      } catch {}
      unlinkSync(target)
    } else {
      throw new Error(`Refusing to overwrite non-symlink ${target}`)
    }
  } catch (err) {
    if (err.code !== 'ENOENT') throw err
  }
  mkdirSync(dirname(target), { recursive: true })
  symlinkSync(source, target, 'dir')
  return true
}

function devDependencies() {
  return (
    JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
      .devDependencies ?? {}
  )
}

/** True when the registry fallback has been applied (deps declared in package.json). */
function fallbackActive() {
  return (
    devDependencies()['@deepseek-ai/dsh-client-ui-primitives'] !== undefined
  )
}

/** Keep pnpm on the project's local-store convention when one exists (.pnpm-store). */
function storeArgs() {
  return existsSync(join(root, '.pnpm-store'))
    ? ['--store-dir', join(root, '.pnpm-store')]
    : []
}

/** Fallback: pull the five packages from the configured registry. */
function applyRegistryFallback() {
  if (fallbackActive()) {
    const missing = SCOPED.filter(
      (name) => !existsSync(join(root, 'node_modules', '@deepseek-ai', name)),
    )
    if (missing.length === 0) {
      console.log(
        'link-dsh: registry fallback already installed (declared in devDependencies)',
      )
      return
    }
    console.log(
      'link-dsh: registry fallback declared but missing from node_modules — running pnpm install',
    )
    run('pnpm', pnpmArgs(['install']))
    return
  }
  console.log(
    'link-dsh: no global DSH install found — falling back to registry copies',
  )
  const raw = JSON.parse(
    runCapture(
      'pnpm',
      pnpmArgs(['view', '@deepseek-ai/dsh', 'version', '--json']),
    ),
  )
  const version = typeof raw === 'string' ? raw : raw?.version
  if (typeof version !== 'string' || version === '') {
    throw new Error(
      'Could not resolve the @deepseek-ai/dsh version from the configured registry',
    )
  }
  console.log(
    `link-dsh: pinning fallback types to @deepseek-ai/dsh@${version} ` +
      '(the dsh-client-* packages are published in lockstep with dsh)',
  )
  run(
    'pnpm',
    pnpmArgs([
      'add',
      '-D',
      ...SCOPED.map((name) => `@deepseek-ai/${name}@^${version}`),
    ]),
  )
  console.log('link-dsh: fallback packages added to devDependencies')
  console.log(
    '  types now track the registry release; for exact parity with a running harness,',
  )
  console.log(
    '  install DSH globally (`npm install -g @deepseek-ai/dsh`) and run:',
  )
  console.log(
    `  pnpm remove -D ${SCOPED.map((name) => `@deepseek-ai/${name}`).join(' ')} ` +
      '&& node scripts/link-dsh.mjs',
  )
}

let dsh
try {
  dsh = resolveDshPackage()
} catch (error) {
  if (process.env.DSH_GLOBAL !== undefined && process.env.DSH_GLOBAL !== '') {
    console.error(
      'link-dsh: DSH_GLOBAL was set but no usable install was found there',
    )
    console.error(`  ${error.message}`)
    process.exit(1)
  }
  console.warn(`link-dsh: ${error.message}`)
  try {
    applyRegistryFallback()
  } catch (fallbackError) {
    console.error(
      `link-dsh: registry fallback failed: ${fallbackError.message}`,
    )
    console.error(
      '  check the pnpm registry configuration (project .npmrc / `pnpm config set registry`),',
    )
    console.error(
      '  or pass `--registry <url>`; alternatively install DSH globally and re-run.',
    )
    process.exit(1)
  }
  process.exit(0)
}

if (fallbackActive()) {
  console.log(
    'link-dsh: registry fallback deps are declared in package.json — they take precedence ' +
      'over a global install',
  )
  console.log(
    '  (to use global-install links instead, remove the fallback deps first:)',
  )
  console.log(
    `  pnpm remove -D ${SCOPED.map((name) => `@deepseek-ai/${name}`).join(' ')}`,
  )
  process.exit(0)
}

const dshModules = join(dsh, 'node_modules')
const scope = join(root, 'node_modules', '@deepseek-ai')
for (const name of SCOPED) {
  let source = join(dshModules, '@deepseek-ai', name)
  if (!existsSync(source)) {
    source = join(dirname(dsh), name)
  }
  if (!existsSync(source))
    throw new Error(`Global DSH lacks @deepseek-ai/${name} (${source})`)
  if (link(source, join(scope, name)))
    console.log(`linked @deepseek-ai/${name}`)
}
const reactSource = existsSync(join(dshModules, 'react'))
  ? join(dshModules, 'react')
  : join(dirname(dirname(dsh)), 'react')
if (existsSync(reactSource)) {
  if (link(reactSource, join(root, 'node_modules', 'react')))
    console.log('linked react')
} else {
  console.warn(
    'global DSH has no react package to link; @types/react is used for types only',
  )
}
console.log(`link-dsh: all packages linked from ${dsh}`)
