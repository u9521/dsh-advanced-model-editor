import test from 'node:test'
import assert from 'node:assert/strict'

import {
  OFFICIAL_FIELDS,
  OFFICIAL_REASONING,
  PROFILE_FIELDS,
  SETTINGS_NS,
} from '../src/client/constants.ts'
import {
  buildProfileOps,
  deleteProviderOps,
  groupProviderRows,
  initialEditorState,
  stripModelCompat,
} from '../src/client/state.ts'
import {
  createDefaultReasoningEfforts,
  formatCapacity,
  parseCapacity,
} from '../src/client/utils.ts'
import {
  validateModel,
  validateOfficialProfile,
  validateProfile,
  validateRetryPolicy,
} from '../src/client/validation.ts'

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

test('parses K/M/G/B/T and Ki/Mi/Gi/Ti capacity spellings into numbers', () => {
  assert.equal(parseCapacity(''), undefined)
  assert.equal(parseCapacity('   '), undefined)
  assert.equal(parseCapacity('256K'), 256000)
  assert.equal(parseCapacity('256k'), 256000)
  assert.equal(parseCapacity('256KB'), 256000)
  assert.equal(parseCapacity('1M'), 1000000)
  assert.equal(parseCapacity('1m'), 1000000)
  assert.equal(parseCapacity('1MB'), 1000000)
  assert.equal(parseCapacity('1.5K'), 1500)
  assert.equal(parseCapacity('2.3M'), 2300000)
  assert.equal(parseCapacity('1G'), 1000000000)
  assert.equal(parseCapacity('1B'), 1000000000)
  assert.equal(parseCapacity('1T'), 1000000000000)
  assert.equal(parseCapacity('128MiB'), 134217728)
  assert.equal(parseCapacity('128Mi'), 134217728)
  assert.equal(parseCapacity('128mi'), 134217728)
  assert.equal(parseCapacity('20MiB'), 20971520)
  assert.equal(parseCapacity('1Mi'), 1048576)
  assert.equal(parseCapacity('64KiB'), 65536)
  assert.equal(parseCapacity('128Ki'), 131072)
  assert.equal(parseCapacity('131072'), 131072)
  assert.equal(parseCapacity(' 64K '), 64000)
  assert.equal(parseCapacity(' 128 MiB '), 134217728)
  assert.ok(Number.isNaN(parseCapacity('abc')))
  assert.ok(Number.isNaN(parseCapacity('12K3')))
})

test('formats stored counts back in the shortest unit spelling', () => {
  assert.equal(formatCapacity(256000), '256K')
  assert.equal(formatCapacity(1000000), '1M')
  assert.equal(formatCapacity(2000000), '2M')
  assert.equal(formatCapacity(2300000), '2300K')
  assert.equal(formatCapacity(134217728), '128Mi')
  assert.equal(formatCapacity(20971520), '20Mi')
  assert.equal(formatCapacity(1048576), '1Mi')
  assert.equal(formatCapacity(131072), '128Ki')
  assert.equal(formatCapacity(262144), '256Ki')
  assert.equal(formatCapacity(0), '0')
  assert.equal(formatCapacity(1), '1')
  // Round trips through parseCapacity for all whole multiples.
  for (const value of [
    1000, 64000, 262144, 1000000, 2000000, 131072, 134217728, 20971520, 1048576,
  ]) {
    assert.equal(parseCapacity(formatCapacity(value)), value)
  }
})

test('declares every llm-pi-ai provider field', () => {
  assert.equal(SETTINGS_NS, 'llm-pi-ai')
  assert.deepEqual(PROFILE_FIELDS, [
    'apiKeyEnv', 'displayName', 'api', 'baseURL', 'models', 'modelOverrides',
    'compat', 'defaultContextWindow', 'defaultMaxTokens', 'defaultInput',
    'headers', 'reasoning', 'thinkingBudgets', 'cacheRetention', 'transport',
    'timeoutMs', 'websocketConnectTimeoutMs', 'streamIdleTimeoutMs',
    'maxRequestImageBytes', 'requestImagePixelBudget', 'requestImageMaxBytes',
    'retryPolicy',
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

test('accepts valid official profile with vision and Files API settings', () => {
  assert.deepEqual(OFFICIAL_REASONING, ['off', 'low', 'high', 'max'])
  assert.ok(OFFICIAL_FIELDS.includes('maxRequestFilesBytes'))
  assert.ok(OFFICIAL_FIELDS.includes('fileExpiresAfterSeconds'))

  const profile = {
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    baseURL: 'https://api.deepseek.com',
    thinking: 'enabled',
    reasoningEffort: 'low',
    maxTokens: 256000,
    defaultContextWindow: 1000000,
    streamIdleTimeoutMs: 300000,
    maxRequestFilesBytes: 134217728,
    maxInlineRequestImageBytes: 20971520,
    maxImagesPerRequest: 600,
    imageOffloadByteQuantum: 67108864,
    inlineImageOffloadByteQuantum: 10485760,
    imageOffloadCountQuantum: 20,
    filesApiTimeoutMs: 60000,
    fileExpiresAfterSeconds: 604800,
    fileRefreshMarginSeconds: 3600,
    fileQuotaCleanupBatch: 100,
    retryPolicy: {
      mode: 'always',
      backoff: { initialDelayMs: 500, maxDelayMs: 10000, jitterRatio: 0.1 },
    },
    models: [
      {
        id: 'deepseek-v4-flash',
        name: 'DeepSeek-V4-Flash',
        contextWindow: 1000000,
      },
      {
        id: 'deepseek-v4-flash-vision-exp',
        name: 'DeepSeek-V4-Flash-Vision-Exp',
        inputModalities: ['text', 'image'],
        imagePixelBudget: 'low',
        imageMaxBytes: 1048576,
      },
    ],
  }
  assert.deepEqual(validateOfficialProfile(profile), [])
})

test('rejects invalid official profile vision, file, thinking, and model configurations', () => {
  // Model cannot declare deprecated imageDetail
  assert.match(
    validateOfficialProfile({
      models: [
        {
          id: 'vision-model',
          inputModalities: ['text', 'image'],
          imageDetail: 'low',
        },
      ],
    }).join(' '),
    /invalid/,
  )

  // Thinking disabled but reasoningEffort is not off
  assert.match(
    validateOfficialProfile({
      thinking: 'disabled',
      reasoningEffort: 'high',
    }).join(' '),
    /thinkingDisabledReasoning/,
  )

  // Text-only model cannot declare image parameters
  assert.match(
    validateOfficialProfile({
      models: [
        {
          id: 'text-model',
          inputModalities: ['text'],
          imagePixelBudget: 640000,
        },
      ],
    }).join(' '),
    /textOnlyImageLimits/,
  )

  // Quantum exceeds max
  assert.match(
    validateOfficialProfile({
      maxRequestFilesBytes: 1000,
      imageOffloadByteQuantum: 2000,
    }).join(' '),
    /quantumExceedsMax/,
  )

  // File refresh margin must be less than file expires
  assert.match(
    validateOfficialProfile({
      fileExpiresAfterSeconds: 3600,
      fileRefreshMarginSeconds: 3600,
    }).join(' '),
    /fileRefreshOrder/,
  )

  // File expiry below minimum (3600s)
  assert.match(
    validateOfficialProfile({
      fileExpiresAfterSeconds: 100,
    }).join(' '),
    /validation\.number/,
  )

  // Duplicate model id
  assert.match(
    validateOfficialProfile({
      models: [{ id: 'dup' }, { id: 'dup' }],
    }).join(' '),
    /duplicateModel/,
  )
})

test('filters compat switches precisely per protocol', () => {
  const profile = {
    api: 'anthropic-messages',
    compat: {
      supportsTemperature: true,
      thinkingFormat: 'openai',
    },
    models: [
      {
        id: 'claude',
        compat: {
          supportsTemperature: false,
          forceAdaptiveThinking: true,
          thinkingFormat: 'openai',
          supportsReasoningEffort: true,
        },
      },
    ],
  }
  const filtered = stripModelCompat(profile, 'anthropic-messages')
  assert.deepEqual(filtered.compat, { supportsTemperature: true })
  assert.deepEqual(filtered.models[0].compat, {
    supportsTemperature: false,
    forceAdaptiveThinking: true,
  })
})

test('accepts advanced pi-ai provider with image payload and new thinking format', () => {
  const profile = {
    api: 'openai-completions',
    baseURL: 'https://gateway.example/v1',
    maxRequestImageBytes: 20971520,
    requestImagePixelBudget: 4194304,
    requestImageMaxBytes: 1048576,
    compat: {
      thinkingFormat: 'baseten',
      supportsDeveloperRole: false,
      supportsFinishReason: false,
      supportsThinkingTokenBudget: true,
      maxTokensField: 'max_tokens',
      cacheControlFormat: 'anthropic',
      supportsStrictMode: true,
      supportsLongCacheRetention: true,
    },
    models: [
      {
        id: 'model-a',
        compat: {
          thinkingFormat: 'qwen-chat-template',
          supportsFinishReason: true,
          supportsThinkingTokenBudget: false,
        },
      },
    ],
  }
  assert.deepEqual(validateProfile(profile), [])
  const stripped = stripModelCompat(profile, 'openai-completions')
  assert.equal(stripped.compat.supportsFinishReason, false)
  assert.equal(stripped.compat.supportsThinkingTokenBudget, true)
  assert.equal(stripped.models[0].compat.supportsFinishReason, true)
  assert.equal(stripped.models[0].compat.supportsThinkingTokenBudget, false)
})

test('creates default custom reasoning efforts in order from off to max', () => {
  const defaultEfforts = createDefaultReasoningEfforts()
  assert.deepEqual(defaultEfforts, {
    off: null,
    minimal: 'minimal',
    low: 'low',
    medium: 'medium',
    high: 'high',
    xhigh: 'xhigh',
    max: 'max',
  })
  assert.deepEqual(
    Object.keys(defaultEfforts),
    ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'],
  )
})
