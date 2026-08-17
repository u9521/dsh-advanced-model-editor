#!/usr/bin/env node
/**
 * Build script — DSH official tsdown pipeline, vendored into this repository.
 *
 * The official client-bundle preset lives at
 * external/deepseek-harness/packages/client/tsdown.client.ts (a copy of
 * deepseek-ai/deepseek-harness packages/client/tsdown.client.ts), so no
 * external DSH source checkout is needed:
 *   1. `tsc -p tsconfig.json` (type check + emit lib/types)
 *   2. `tsdown -c tsdown.config.mjs` (lib/index.js + lib/client.js)
 *
 * `--check` runs tsc --noEmit instead of emitting and bundling.
 *
 * Before type-checking, the @deepseek-ai platform packages must be resolvable
 * in node_modules. When they are missing, scripts/link-dsh.mjs is run: it
 * symlinks them from a globally installed DSH, or — if no DSH install can be
 * found — pulls the packages from the configured npm registry.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const CHECK_ONLY = process.argv.includes('--check')

// dsh.client packages tsc must resolve (mirrors scripts/link-dsh.mjs).
const PLATFORM_PACKAGES = [
  'dsh-api-remotes',
  'dsh-client-locale',
  'dsh-client-runtime',
  'dsh-client-ui-primitives',
  'dsh-client-ui-settings',
]

/** Run a binary with cwd=root, inheriting stdio; exit the process on failure. */
function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

mkdirSync(join(root, 'lib'), { recursive: true })
if (
  PLATFORM_PACKAGES.some(
    (name) => !existsSync(join(root, 'node_modules', '@deepseek-ai', name)),
  )
) {
  console.log(
    'build: @deepseek-ai platform packages missing — running scripts/link-dsh.mjs',
  )
  run(process.execPath, [join(root, 'scripts', 'link-dsh.mjs')])
}
const args = ['-p', 'tsconfig.json']
if (CHECK_ONLY) args.push('--noEmit', '--pretty', 'false')
run(process.execPath, [
  join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
  ...args,
])
if (!CHECK_ONLY) {
  run(join(root, 'node_modules', '.bin', 'tsdown'), ['-c', 'tsdown.config.mjs'])
}
