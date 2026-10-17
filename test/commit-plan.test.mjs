import test from 'node:test'
import assert from 'node:assert/strict'

import { commit, diffProfile, removeProfile } from '../src/client/commit.ts'
import { PROFILE_FIELDS, SETTINGS_NS } from '../src/client/constants.ts'
import { planReplace, planSave } from '../src/client/plan.ts'
import {
  credentialStatus,
  mergeCredentialChecks,
} from '../src/client/credential-status.ts'
import {
  COMPAT_FIELDS,
  COMPAT_PROTOCOL_FIELDS,
  compatFields,
  compatValueConfigured,
  filterCompatForProtocol,
} from '../src/client/compat.ts'
import { validateCompat } from '../src/client/validation.ts'

/** A provider row with only the fields the plan reads. */
function row(provider = 'cpa', declared = true) {
  return {
    provider,
    displayName: provider,
    settingsNs: SETTINGS_NS,
    settingsPath: ['providers', provider],
    declared,
  }
}

/** A config form fake that records the batches it is handed. */
function formOf(accepted = true) {
  const batches = []
  return {
    batches,
    async mutate(ops) {
      batches.push(ops)
      return accepted
    },
  }
}

/** A client fake whose credential calls are recorded and can be made to fail. */
function apiOf({ credentialOk = true } = {}) {
  const calls = []
  return {
    calls,
    llm: {
      async providers() {
        return { result: { ok: true, value: { providers: [] } } }
      },
      async discoverModels() {
        return { result: { ok: true, value: [] } }
      },
    },
    credentials: {
      async describe() {
        return { result: { ok: true, value: {} } }
      },
      async set(input) {
        calls.push(['set', input])
        return credentialOk
          ? { result: { ok: true, value: undefined } }
          : { result: { ok: false, error: { message: 'key refused' } } }
      },
      async unset(input) {
        calls.push(['unset', input])
        return { result: { ok: true, value: undefined } }
      },
    },
  }
}

test('planSave writes only the fields the user touched', () => {
  const baseline = {
    profile: { api: 'openai-completions', baseURL: 'https://old.example/v1' },
    explicit: { baseURL: true },
  }
  const draft = { ...baseline.profile, baseURL: 'https://new.example/v1' }
  const plan = planSave({
    row: row(),
    draft,
    baseline,
    explicit: { baseURL: true },
    keyValue: '',
    keyRef: 'CPA_API_KEY',
    chosen: PROFILE_FIELDS,
  })
  assert.deepEqual(plan.ops, [
    {
      op: 'set',
      path: ['providers', 'cpa', 'baseURL'],
      value: 'https://new.example/v1',
    },
  ])
})

test('planSave drops a field the route schema does not offer', () => {
  const baseline = { profile: {}, explicit: {} }
  const draft = { baseURL: 'https://x.example/v1', reasoning: 'high' }
  const plan = planSave({
    row: row(),
    draft,
    baseline,
    explicit: { baseURL: true, reasoning: true },
    keyValue: '',
    keyRef: 'CPA_API_KEY',
    chosen: ['baseURL', 'apiKeyEnv'],
  })
  assert.deepEqual(
    plan.ops.map((op) => op.path.join('.')),
    ['providers.cpa.baseURL'],
  )
})

test('planSave validates the same profile it writes', () => {
  const baseline = { profile: {}, explicit: {} }
  const draft = { api: 'openai-completions', baseURL: 'https://x.example/v1' }
  const plan = planSave({
    row: row(),
    draft,
    baseline,
    explicit: { api: true, baseURL: true },
    keyValue: '',
    keyRef: 'CPA_API_KEY',
    chosen: PROFILE_FIELDS,
  })
  // Every field the plan claims in the validation profile must appear in the
  // batch, or the two projections have drifted apart again.
  for (const field of Object.keys(plan.profile)) {
    if (field === 'apiKeyEnv') continue
    assert.ok(
      plan.ops.some((op) => op.path.at(-1) === field),
      `${field} is validated but never written`,
    )
  }
})

test('planSave pairs a typed key with its reference', () => {
  const baseline = { profile: {}, explicit: {} }
  const plan = planSave({
    row: row(),
    draft: { baseURL: 'https://x.example/v1' },
    baseline,
    explicit: { baseURL: true },
    keyValue: 'sk-test',
    keyRef: 'CPA_API_KEY',
    chosen: PROFILE_FIELDS,
  })
  assert.deepEqual(plan.credential, { ref: 'CPA_API_KEY', value: 'sk-test' })
  assert.ok(
    plan.ops.some(
      (op) =>
        op.op === 'set' &&
        op.path.at(-1) === 'apiKeyEnv' &&
        op.value === 'CPA_API_KEY',
    ),
  )
})

test('planReplace turns a dropped field into an unset', () => {
  const ops = planReplace(
    [],
    { baseURL: 'https://a.example', maxTokens: 10 },
    {
      baseURL: 'https://a.example',
    },
  )
  assert.deepEqual(ops, [{ op: 'unset', path: ['maxTokens'] }])
})

test('diffProfile reports nothing for an unchanged subtree', () => {
  assert.deepEqual(diffProfile([], { a: 1 }, { a: 1 }), [])
  assert.deepEqual(diffProfile([], undefined, {}), [])
})

test('commit writes the profile before the credential', async () => {
  const form = formOf(true)
  const api = apiOf()
  const outcome = await commit({
    form,
    ops: [{ op: 'set', path: ['providers', 'cpa', 'baseURL'], value: 'x' }],
    api,
    credential: { ref: 'CPA_API_KEY', value: 'sk-test' },
    reload: async () => undefined,
  })
  assert.equal(outcome.kind, 'written')
  assert.equal(form.batches.length, 1)
  assert.deepEqual(api.calls, [
    ['set', { ref: 'CPA_API_KEY', value: 'sk-test' }],
  ])
})

test('commit stops before the credential when the write is refused', async () => {
  const form = formOf(false)
  const api = apiOf()
  const outcome = await commit({
    form,
    ops: [{ op: 'set', path: ['providers', 'cpa', 'baseURL'], value: 'x' }],
    api,
    credential: { ref: 'CPA_API_KEY', value: 'sk-test' },
    reload: async () => undefined,
  })
  assert.equal(outcome.kind, 'conflict')
  assert.deepEqual(api.calls, [])
})

test('a refused credential is reported without losing the profile write', async () => {
  const form = formOf(true)
  const api = apiOf({ credentialOk: false })
  const outcome = await commit({
    form,
    ops: [{ op: 'set', path: ['providers', 'cpa', 'baseURL'], value: 'x' }],
    api,
    credential: { ref: 'CPA_API_KEY', value: 'sk-test' },
    reload: async () => undefined,
  })
  assert.deepEqual(outcome, {
    kind: 'credential-failed',
    message: 'key refused',
  })
  assert.equal(form.batches.length, 1)
})

test('removeProfile clears the credential before the profile', async () => {
  const form = formOf(true)
  const api = apiOf()
  const outcome = await removeProfile({
    form,
    api,
    path: ['providers', 'cpa'],
    credentialRef: 'CPA_API_KEY',
    reload: async () => undefined,
  })
  assert.equal(outcome.kind, 'written')
  assert.deepEqual(api.calls, [['unset', { ref: 'CPA_API_KEY' }]])
  assert.deepEqual(form.batches[0], [
    { op: 'unset', path: ['providers', 'cpa'] },
  ])
})

test('removeProfile leaves the profile alone when the credential clear fails', async () => {
  const form = formOf(true)
  const api = apiOf()
  api.credentials.unset = async () => ({
    result: { ok: false, error: { message: 'key store down' } },
  })
  const outcome = await removeProfile({
    form,
    api,
    path: ['providers', 'cpa'],
    credentialRef: 'CPA_API_KEY',
    reload: async () => undefined,
  })
  assert.deepEqual(outcome, { kind: 'failed', message: 'key store down' })
  assert.deepEqual(form.batches, [])
})

test('the compat table offers exactly the keys each protocol lists', () => {
  const listed = new Set(Object.values(COMPAT_PROTOCOL_FIELDS).flat())
  assert.deepEqual(
    COMPAT_FIELDS.filter((field) => !listed.has(field.key)),
    [],
  )
  assert.deepEqual(
    [...listed].filter(
      (key) => !COMPAT_FIELDS.some((field) => field.key === key),
    ),
    [],
  )
  assert.equal(compatFields('openai-completions').length, 19)
  assert.equal(compatFields('openai-responses').length, 4)
  assert.equal(compatFields('anthropic-messages').length, 7)
  assert.equal(COMPAT_FIELDS.length, 26)
})

test('an unknown protocol falls back to the same set the editor renders', () => {
  assert.deepEqual(
    compatFields('no-such-api').map((field) => field.key),
    compatFields('openai-completions').map((field) => field.key),
  )
})

test('chat template args are offered and filtered like every other key', () => {
  const keys = compatFields('openai-completions').map((field) => field.key)
  assert.ok(keys.includes('chatTemplateKwargs'))
  assert.ok(keys.includes('chatTemplateArgs'))
  assert.deepEqual(
    filterCompatForProtocol(
      { chatTemplateKwargs: { enable_thinking: true }, supportsStore: true },
      'openai-completions',
    ),
    { chatTemplateKwargs: { enable_thinking: true }, supportsStore: true },
  )
})

test('filterCompatForProtocol drops keys the protocol does not offer', () => {
  assert.deepEqual(
    filterCompatForProtocol(
      { thinkingFormat: 'openai', supportsTemperature: true },
      'anthropic-messages',
    ),
    { supportsTemperature: true },
  )
  assert.deepEqual(
    filterCompatForProtocol({ supportsStore: true }, 'no-such-api'),
    { supportsStore: true },
  )
})

test('compatValueConfigured treats an empty object as unset', () => {
  assert.equal(compatValueConfigured({}), false)
  assert.equal(compatValueConfigured(''), false)
  assert.equal(compatValueConfigured(undefined), false)
  assert.equal(compatValueConfigured(false), true)
  assert.equal(compatValueConfigured({ a: 1 }), true)
})

test('validateCompat judges compat against the route protocol', () => {
  const errors = []
  validateCompat(
    { thinkingFormat: 'openai' },
    'compat',
    errors,
    'anthropic-messages',
  )
  // A completions-only key on an anthropic route is not offered, so validating
  // it here would judge an object the write never carries.
  assert.deepEqual(errors, [])

  const invalid = []
  validateCompat(
    { thinkingFormat: 'nope' },
    'compat',
    invalid,
    'openai-completions',
  )
  assert.deepEqual(invalid, ['validation.invalid'])
})

test('credentialStatus covers all five postures', () => {
  const checks = { CPA_API_KEY: { configured: true, writable: true } }
  assert.equal(
    credentialStatus(undefined, checks, true, 'CPA_API_KEY'),
    'credential.configured',
  )
  assert.equal(
    credentialStatus(undefined, {}, true, 'CPA_API_KEY'),
    'credential.notConfigured',
  )
  assert.equal(
    credentialStatus(
      { env: ['CPA_API_KEY'], oauth: false },
      checks,
      false,
      'X',
    ),
    'credential.nativeConfigured',
  )
  assert.equal(
    credentialStatus({ env: ['MISSING'], oauth: true }, {}, false, 'X'),
    'credential.nativeOAuth',
  )
  assert.equal(
    credentialStatus({ env: [], oauth: false }, {}, false, 'X'),
    'credential.nativeNone',
  )
  assert.equal(
    credentialStatus({ env: ['MISSING'], oauth: false }, {}, false, 'X'),
    'credential.nativeMissing',
  )
})

test('mergeCredentialChecks lets the field read win for its own reference', () => {
  assert.deepEqual(
    mergeCredentialChecks({ A: { configured: false, writable: true } }, 'A', {
      configured: true,
      writable: true,
    }),
    { A: { configured: true, writable: true } },
  )
})
