import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))

/**
 * Candidate roots that may hold an `@deepseek-ai` tree: this package's own
 * install first, then the global DSH install the CLI runs from.
 * @returns every candidate `node_modules` directory, most specific first.
 */
function candidateRoots() {
  const roots = [join(root, 'node_modules')]
  // The CLI global install: bun puts it under ~/.bun/install/global, npm and
  // pnpm under their own prefixes. All expose the same `@deepseek-ai/<pkg>`
  // layout.
  const home = process.env.HOME
  if (typeof home === 'string' && home.length > 0) {
    roots.push(join(home, '.bun/install/global/node_modules'))
    roots.push(join(home, '.local/share/pnpm/global/5/node_modules'))
  }
  return roots
}

/**
 * Resolve one DSH package directory from a candidate root.
 *
 * The devDependencies deliberately do not carry the adapter packages the drift
 * test inspects: they are Host-side, the browser bundle never imports them, and
 * pinning them here would duplicate the install. So the test reaches the
 * running DSH install instead, and skips (loudly) when there is none.
 * @param name - package name under `@deepseek-ai`.
 * @returns the absolute package directory, or undefined when not installed.
 */
export function dshPackageDir(name) {
  for (const base of candidateRoots()) {
    const dir = join(base, '@deepseek-ai', name)
    if (existsSync(join(dir, 'package.json'))) return dir
  }
  return undefined
}

/**
 * Read one file from an installed DSH package.
 * @param name - package name under `@deepseek-ai`.
 * @param relative - path inside the package.
 * @returns the file text, or undefined when the package or file is absent.
 */
export function dshFile(name, relative) {
  const dir = dshPackageDir(name)
  if (dir === undefined) return undefined
  const file = join(dir, relative)
  return existsSync(file) ? readFileSync(file, 'utf8') : undefined
}

/**
 * Read the version of one installed DSH package.
 * @param name - package name under `@deepseek-ai`.
 * @returns the version string, or undefined when the package is absent.
 */
export function dshVersion(name) {
  return dshFile(name, 'package.json') === undefined
    ? undefined
    : JSON.parse(dshFile(name, 'package.json')).version
}

/**
 * Read the name of every `@deepseek-ai` package this plugin installs itself.
 * @returns the installed names, sorted.
 */
export function ownDshPackages() {
  const dir = join(root, 'node_modules', '@deepseek-ai')
  return existsSync(dir) ? readdirSync(dir).sort() : []
}

export { root }
