import test from 'node:test'
import assert from 'node:assert/strict'

import {
  SETTINGS_NS,
  PROFILE_FIELDS,
  buildProfileOps,
  initialEditorState,
  validateModel,
  validateProfile,
  validateRetryPolicy,
  groupProviderRows,
  deleteProviderOps,
  parseCapacity,
  formatCapacity,
  stripModelCompat,
} from '../src/client/core.ts'

test('strips model compat only when saving a non-openai-completions protocol', () => {
  const profile = {
    api: 'anthropic-messages',
    models: [
      { id: 'one', compat: { thinkingFormat: 'openai' }, contextWindow: 64000 },
      { id: 'two', compat: { supportsReasoningEffort: true } },
    ],
    modelOverrides: { builtin: { compat: { thinkingFormat: 'openai' } } },
  }
  const stripped = stripModelCompat(profile, 'anthropic-messages')
  assert.deepEqual(stripped.models, [
    { id: 'one', contextWindow: 64000 },
    { id: 'two' },
  ])
  assert.deepEqual(stripped.modelOverrides, { builtin: {} })
  assert.equal(stripped.api, 'anthropic-messages')

  // openai-completions (and an unset protocol) keep compat untouched.
  assert.equal(stripModelCompat(profile, 'openai-completions'), profile)
  assert.equal(stripModelCompat(profile, undefined), profile)
  // Any other protocol strips compat.
  const responses = stripModelCompat(profile, 'openai-responses')
  assert.equal(responses.models[0].compat, undefined)
  assert.equal(responses.models[1].compat, undefined)
  // Original profile is never mutated.
  assert.equal(profile.models[0].compat.thinkingFormat, 'openai')
  assert.ok(profile.models[0].compat)
})

test('parses K/M capacity spellings into plain token counts', () => {
  assert.equal(parseCapacity(''), undefined)
  assert.equal(parseCapacity('   '), undefined)
  assert.equal(parseCapacity('256K'), 256000)
  assert.equal(parseCapacity('256k'), 256000)
  assert.equal(parseCapacity('1M'), 1000000)
  assert.equal(parseCapacity('1m'), 1000000)
  assert.equal(parseCapacity('1.5K'), 1500)
  assert.equal(parseCapacity('2.3M'), 2300000)
  assert.equal(parseCapacity('131072'), 131072)
  assert.equal(parseCapacity(' 64K '), 64000)
  assert.ok(Number.isNaN(parseCapacity('abc')))
  assert.ok(Number.isNaN(parseCapacity('12K3')))
})

test('formats stored counts back in the shortest K/M spelling', () => {
  assert.equal(formatCapacity(256000), '256K')
  assert.equal(formatCapacity(1000000), '1M')
  assert.equal(formatCapacity(2000000), '2M')
  assert.equal(formatCapacity(2300000), '2300K')
  assert.equal(formatCapacity(131072), '131072')
  assert.equal(formatCapacity(0), '0')
  assert.equal(formatCapacity(1), '1')
  // Round trips through parseCapacity for every M/K whole multiple.
  for (const value of [1000, 64000, 262144, 1000000, 2000000, 131072]) {
    assert.equal(parseCapacity(formatCapacity(value)), value)
  }
})

test('declares every llm-pi-ai provider field', () => {
  assert.equal(SETTINGS_NS, 'llm-pi-ai')
  assert.deepEqual(PROFILE_FIELDS, [
    'apiKeyEnv', 'displayName', 'api', 'baseURL', 'models', 'modelOverrides',
    'compat', 'defaultContextWindow', 'defaultMaxTokens', 'defaultInput',
    'headers', 'reasoning', 'thinkingBudgets', 'cacheRetention', 'transport',
    'timeoutMs', 'websocketConnectTimeoutMs', 'streamIdleTimeoutMs', 'retryPolicy',
  ])
})

test('preserves untouched fields and emits only profile field operations', () => {
  const namespace = {
    value: { providers: { cpa: { baseURL: 'https://old.example/v1', headers: { 'X-Trace': 'before' }, transport: 'auto' } } },
    user: { providers: { cpa: { baseURL: 'https://old.example/v1', headers: { 'X-Trace': 'before' } } } },
  }
  const initial = initialEditorState(namespace, ['providers', 'cpa'])
  const draft = { ...initial.profile, headers: { 'X-Trace': 'after' }, transport: 'sse' }
  const explicit = { ...initial.explicit, transport: true }

  assert.deepEqual(buildProfileOps(['providers', 'cpa'], initial, draft, explicit), [
    { op: 'set', path: ['providers', 'cpa', 'headers'], value: { 'X-Trace': 'after' } },
    { op: 'set', path: ['providers', 'cpa', 'transport'], value: 'sse' },
  ])
})

test('unchecking an inherited override emits a field-scoped unset', () => {
  const initial = {
    profile: { timeoutMs: 5000, models: [{ id: 'one' }] },
    explicit: { timeoutMs: true, models: true },
  }
  const explicit = { timeoutMs: false, models: true }
  assert.deepEqual(buildProfileOps(['providers', 'cpa'], initial, initial.profile, explicit), [
    { op: 'unset', path: ['providers', 'cpa', 'timeoutMs'] },
  ])
})

test('accepts an advanced profile covering transport, budgets, headers and retry', () => {
  const profile = {
    api: 'openai-completions',
    baseURL: 'https://gateway.example/v1',
    defaultContextWindow: 262144,
    defaultMaxTokens: 32768,
    defaultInput: ['text', 'image'],
    headers: { 'X-Provider': 'routing' },
    reasoning: 'high',
    thinkingBudgets: { low: 1024, high: 8192 },
    cacheRetention: 'long',
    transport: 'websocket-cached',
    timeoutMs: 30000,
    websocketConnectTimeoutMs: 5000,
    streamIdleTimeoutMs: 300000,
    compat: { thinkingFormat: 'openai', supportsReasoningEffort: true },
    retryPolicy: {
      mode: 'normal',
      maxRetries: 3,
      retryableCodes: ['RATE_LIMIT', 'SERVER'],
      backoff: { initialDelayMs: 500, maxDelayMs: 10000, jitterRatio: 0.1 },
    },
    models: [{
      id: 'gateway-model',
      input: ['text', 'image'],
      reasoningEfforts: { off: null, high: 'high' },
      compat: { thinkingFormat: 'openai' },
    }],
  }
  assert.deepEqual(validateProfile(profile), [])
})

test('rejects invalid retry, simultaneous catalog modes, and invalid model reasoning', () => {
  assert.match(validateRetryPolicy({ mode: 'normal', maxRetries: 1, retryableCodes: [], backoff: { initialDelayMs: 20, maxDelayMs: 10, jitterRatio: 2 } }).join(' '), /retryCodes|backoffOrder/)
  assert.match(validateProfile({ models: [{ id: 'one' }], modelOverrides: { one: {} } }).join(' '), /catalogConflict/)
  assert.match(validateModel({ id: 'one', reasoningEfforts: { high: '' } }).join(' '), /validation\.invalid/)
})

test('shows only user-added profiles in built-in and custom sections', () => {
  const namespace = { user: { providers: { deepseek: {}, cpa: { baseURL: 'https://gateway.example/v1' } } } }
  const rows = [
    { provider: 'deepseek', displayName: 'DeepSeek', settingsNs: SETTINGS_NS, settingsPath: ['providers', 'deepseek'], declared: false },
    { provider: 'cpa', displayName: 'CPA', settingsNs: SETTINGS_NS, settingsPath: ['providers', 'cpa'], declared: true },
    { provider: 'openai', displayName: 'OpenAI', settingsNs: SETTINGS_NS, settingsPath: ['providers', 'openai'], declared: false },
  ]
  const grouped = groupProviderRows(rows, namespace)
  assert.deepEqual(grouped.builtIn.map((row) => row.provider), ['deepseek'])
  assert.deepEqual(grouped.custom.map((row) => row.provider), ['cpa'])
})

test('allows deletion only for a user-added llm-pi-ai route', () => {
  assert.deepEqual(deleteProviderOps({
    provider: 'cpa', declared: true, userAdded: true, settingsNs: SETTINGS_NS, settingsPath: ['providers', 'cpa'],
  }), [{ op: 'unset', path: ['providers', 'cpa'] }])
  assert.throws(() => deleteProviderOps({
    provider: 'deepseek', declared: false, userAdded: false, settingsNs: SETTINGS_NS, settingsPath: ['providers', 'deepseek'],
  }), /deleteOnlyUserAdded/)
})
