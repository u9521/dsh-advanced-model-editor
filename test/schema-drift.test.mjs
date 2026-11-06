import test from 'node:test'
import assert from 'node:assert/strict'
import { PROFILE_FIELDS, OFFICIAL_FIELDS } from '../src/client/constants.ts'
import { COMPAT_FIELDS, COMPAT_PROTOCOL_FIELDS } from '../src/client/compat.ts'
import {
  CACHE_CONTROL_FORMATS,
  MAX_TOKENS_FIELDS,
  MODALITIES,
  PROTOCOLS,
  THINKING_FORMATS,
  THINKING_LEVELS,
  THINKING_TOKEN_BUDGET_FIELDS,
} from '../src/client/constants.ts'
import { dshFile, dshVersion } from './dsh-install.mjs'

/**
 * Drift gates against the installed DSH packages.
 *
 * The plugin hand-copies several upstream sets — the pi-ai provider fields, the
 * deepseek settings fields, the compat switch table and the enum literals. Each
 * copy is a promise that the page exposes what the adapter accepts, and an
 * adapter upgrade that adds a field silently breaks that promise: the page
 * still renders, it just cannot show the new field. These tests read the
 * installed declarations and fail when a copy falls behind.
 *
 * They need a DSH install, which CI does not have. A missing install skips with
 * a loud marker rather than passing quietly, so a green run never implies the
 * gates ran.
 */

/**
 * Require one installed package file, skipping the test when DSH is absent.
 * @param t - the running test context.
 * @param pkg - package name under `@deepseek-ai`.
 * @param file - path inside the package.
 * @returns the file text, or undefined when the test was skipped.
 */
function requireDsh(t, pkg, file) {
  const text = dshFile(pkg, file)
  if (text === undefined) {
    t.skip(`SKIPPED: no installed @deepseek-ai/${pkg} — drift gate did not run`)
    console.log(`\n[drift] SKIPPED ${pkg}/${file}: no DSH install found\n`)
    return undefined
  }
  return text
}

/**
 * Read the property names of one interface declaration.
 * @param text - declaration file text.
 * @param name - interface name.
 * @returns the declared property names, in declaration order.
 */
function interfaceFields(text, name) {
  const start = text.indexOf(`interface ${name}`)
  if (start < 0) return []
  let depth = 0
  let opened = false
  let end = start
  for (let index = start; index < text.length; index += 1) {
    if (text[index] === '{') {
      depth += 1
      opened = true
    } else if (text[index] === '}') {
      depth -= 1
      if (opened && depth === 0) {
        end = index
        break
      }
    }
  }
  return [...text.slice(start, end).matchAll(/^ {4}(\w+)\??:/gm)].map(
    (match) => match[1],
  )
}

test('PROFILE_FIELDS matches the installed llm-pi-ai provider schema', (t) => {
  const text = requireDsh(t, 'dsh-llm-pi-ai', 'lib/types/config.d.ts')
  if (text === undefined) return
  const declared = interfaceFields(text, 'PiAiProviderProfile')
  assert.ok(declared.length > 0, 'PiAiProviderProfile parsed empty')
  assert.deepEqual(
    [...PROFILE_FIELDS].sort(),
    [...declared].sort(),
    `page field list drifted from llm-pi-ai@${dshVersion('dsh-llm-pi-ai')}`,
  )
})

test('OFFICIAL_FIELDS matches the installed llm-deepseek section schema', (t) => {
  const config = requireDsh(t, 'dsh-llm-deepseek', 'lib/types/config.d.ts')
  if (config === undefined) return
  const listing = dshFile('dsh-llm-deepseek', 'lib/types/listing-config.d.ts')
  const apiKey = dshFile('dsh-llm-deepseek-api-key', 'lib/types/config.d.ts')
  const declared = new Set([
    ...interfaceFields(config, 'Config'),
    ...(listing === undefined
      ? []
      : interfaceFields(listing, 'ModelListingConfig')),
    ...(apiKey === undefined ? [] : interfaceFields(apiKey, 'Config')),
  ])
  assert.ok(declared.size > 0, 'deepseek Config parsed empty')
  assert.deepEqual(
    [...OFFICIAL_FIELDS].sort(),
    [...declared].sort(),
    `page field list drifted from llm-deepseek@${dshVersion('dsh-llm-deepseek')}`,
  )
})

test('compat switch table matches the installed pi-ai offered fields', (t) => {
  const text = requireDsh(t, 'dsh-llm-pi-ai', 'lib/types/catalog.d.ts')
  if (text === undefined) return
  const offered = new Set(
    [...text.matchAll(/readonly (\w+): "offer"/g)].map((match) => match[1]),
  )
  assert.ok(offered.size > 0, 'compat gates parsed empty')
  assert.deepEqual(
    COMPAT_FIELDS.map((field) => field.key).sort(),
    [...offered].sort(),
    'compat field list drifted from llm-pi-ai',
  )
  // Every field the page renders must be offered by some protocol; a field no
  // protocol lists would render nowhere while the field list still claims it.
  const byProtocol = new Set(Object.values(COMPAT_PROTOCOL_FIELDS).flat())
  assert.deepEqual(
    Object.keys(
      Object.fromEntries([...byProtocol].map((key) => [key, true])),
    ).sort(),
    [...offered].sort(),
    'compat protocol table covers a different field set',
  )
})

/**
 * Read one enum's literal members from the adapter's runtime bundle.
 *
 * The declaration file only says `readonly PiAiModality[]` — the literals live
 * in `Object.keys({ ... })` in the shipped JavaScript. That bundle is the same
 * one the Host executes, so it is the authoritative list.
 * @param source - the package's `lib/index.js` text.
 * @param name - exported constant name.
 * @returns the literal members, or an empty list when the constant is absent.
 */
function runtimeEnum(source, name) {
  const start = source.indexOf(`const ${name} = Object.keys({`)
  if (start < 0) return []
  const end = source.indexOf('})', start)
  if (end < 0) return []
  // Keys may be bare (`text: true`) or quoted (`"openai": true`), and both
  // spellings appear in the same file.
  return [
    ...source.slice(start, end).matchAll(/"?([\w.-]+)"?\s*:\s*true/g),
  ].map((match) => match[1])
}

test('enum literals match the installed pi-ai runtime', (t) => {
  const runtime = requireDsh(t, 'dsh-llm-pi-ai', 'lib/index.js')
  if (runtime === undefined) return
  const checks = [
    ['MODALITIES', MODALITIES],
    ['THINKING_LEVELS', THINKING_LEVELS],
    ['SUPPORTED_THINKING_FORMATS', THINKING_FORMATS],
    ['MAX_TOKENS_FIELDS', MAX_TOKENS_FIELDS],
    ['THINKING_TOKEN_BUDGET_FIELDS', THINKING_TOKEN_BUDGET_FIELDS],
    ['CACHE_CONTROL_FORMATS', CACHE_CONTROL_FORMATS],
  ]
  for (const [name, expected] of checks) {
    const declared = runtimeEnum(runtime, name)
    // A gate that cannot read the source must fail, not skip: a silent pass is
    // how this check went vacuous the first time it was written.
    assert.ok(declared.length > 0, `could not read ${name} from llm-pi-ai`)
    assert.deepEqual([...expected], declared, `${name} drifted from llm-pi-ai`)
  }
  // The protocol union is a runtime schema union, read from the settings schema
  // by choices.ts; the compiled fallback only has to be a subset of the three
  // protocols pi-ai serves.
  assert.deepEqual([...PROTOCOLS].sort(), [
    'anthropic-messages',
    'openai-completions',
    'openai-responses',
  ])
})
