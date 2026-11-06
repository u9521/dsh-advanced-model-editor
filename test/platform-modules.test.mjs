import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { PLATFORM_MODULES } from '../tsdown.config.mjs'
import { dshFile, dshPackageDir, dshVersion } from './dsh-install.mjs'

/**
 * The build's externals list is the module-table contract.
 *
 * tsdown keeps a hard-coded copy of `PLATFORM_MODULES` so a cross-plugin value
 * import fails at build time instead of at runtime. A copy is only as good as
 * its agreement with the shell: a stale entry the table no longer seeds throws
 * at materialization, and a missing entry inlines a duplicate runtime. Both
 * failures are silent until the page is opened, so they are gated here.
 *
 * The source of truth is the seed table compiled into the served frontend,
 * because that is the object the browser actually hands the module loader. The
 * shell package's `platform.d.ts` is only a fallback: a machine can carry a
 * shell whose declaration predates the frontend it serves.
 */

/**
 * Read the seed-table keys out of the built frontend.
 *
 * The bundle constructs the table as an object literal returned from the
 * module-table accessor; only its keys matter here, and they are the exact
 * specifiers a plugin's `require` may ask for.
 * @returns the seed specifiers in declaration order, or undefined when the
 *   frontend artifact is not installed.
 */
function servedPlatformModules() {
  const dir = dshPackageDir('dsh-web-frontend')
  if (dir === undefined) return undefined
  let assets
  try {
    assets = readdirSync(join(dir, 'dist/assets'))
  } catch {
    return undefined
  }
  const entry = assets.find((name) => /^index-.*\.js$/.test(name))
  if (entry === undefined) return undefined
  const source = readFileSync(join(dir, 'dist/assets', entry), 'utf8')
  const anchor = source.indexOf('"react/jsx-runtime"')
  if (anchor < 0) return undefined
  const start = source.lastIndexOf('return{', anchor)
  const end = source.indexOf('}', anchor)
  if (start < 0 || end < 0) return undefined
  const body = source.slice(start + 'return{'.length, end)
  // Keys are either bare identifiers (`react:fk`) or quoted strings.
  return body
    .split(',')
    .map((pair) => pair.slice(0, pair.indexOf(':')).trim())
    .map((key) => key.replace(/^["']|["']$/g, ''))
    .filter((key) => key.length > 0)
}

/**
 * Read `PLATFORM_MODULES` from the shell package's declaration, as a fallback.
 * @returns the declared specifiers, or undefined when it declares no tuple.
 */
function declaredPlatformModules() {
  const text = dshFile('dsh-client-web', 'lib/types/platform.d.ts')
  if (text === undefined) return undefined
  const match = text.match(/PLATFORM_MODULES: readonly \[([^\]]*)\]/)
  if (match === null) return undefined
  return match[1]
    .split(',')
    .map((entry) => entry.trim().replace(/^["']|["']$/g, ''))
    .filter((entry) => entry.length > 0)
}

test('build externals match the seed table the frontend serves', (t) => {
  const served = servedPlatformModules()
  if (served === undefined) {
    t.skip('SKIPPED: no built dsh-web-frontend — module table not compared')
    console.log('\n[platform] SKIPPED: no served frontend found\n')
    return
  }
  assert.deepEqual(
    [...PLATFORM_MODULES],
    served,
    `tsdown externals drifted from dsh-web-frontend@${dshVersion('dsh-web-frontend')}`,
  )
})

test('build externals also match the shell declaration when it is current', (t) => {
  const declared = declaredPlatformModules()
  if (declared === undefined) {
    t.skip('SKIPPED: no installed dsh-client-web declaration')
    return
  }
  const shellVersion = dshVersion('dsh-client-web')
  const frontendVersion = dshVersion('dsh-web-frontend')
  // A shell stricter than the frontend it ships beside is an install artifact,
  // not drift: the browser only ever sees the frontend's table. Comparing them
  // anyway turns a half-updated machine into a red suite for no reason.
  if (shellVersion !== frontendVersion) {
    t.skip(
      `SKIPPED: dsh-client-web@${shellVersion} is not the served ${frontendVersion} shell`,
    )
    return
  }
  assert.deepEqual([...PLATFORM_MODULES], declared)
})

test('every runtime import of the built bundle is a platform module', () => {
  // Read the emitted artifact rather than the source, so a bundling mistake
  // (inlining instead of requiring, or a stray external) is what fails.
  const artifact = readFileSync('lib/client.js', 'utf8')
  const requested = new Set(
    [...artifact.matchAll(/require\("([^"]+)"\)/g)].map((match) => match[1]),
  )
  assert.ok(requested.size > 0, 'bundle requires nothing at all')
  const unknown = [...requested].filter(
    (specifier) => !PLATFORM_MODULES.includes(specifier),
  )
  assert.deepEqual(unknown, [], 'bundle requires a non-platform module')
})
