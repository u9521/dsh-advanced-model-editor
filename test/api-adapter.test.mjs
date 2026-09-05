import test from 'node:test'
import assert from 'node:assert/strict'

import { createModelApi } from '../src/client/api.ts'

function createMockCtx(overrides = {}) {
  return {
    remote: {
      llm: {
        listProviders: async () => ({
          ok: true,
          value: [
            { id: 'deepseek', name: 'DeepSeek' },
            { id: 'openai', name: 'OpenAI' },
            { id: 'custom-extra', name: 'Custom Extra' },
          ],
        }),
        listConfigurableProviders: async () => ({
          ok: true,
          value: [
            {
              provider: 'deepseek',
              displayName: 'DeepSeek Built-in',
              settingsNs: 'llm-pi-ai',
              settingsPath: ['providers', 'deepseek'],
              declared: false,
            },
            {
              provider: 'custom-gate',
              displayName: 'Custom Gateway',
              settingsNs: 'llm-pi-ai',
              settingsPath: ['providers', 'custom-gate'],
              declared: true,
            },
          ],
        }),
        discoverModels: async (settingsNs, request) => ({
          ok: true,
          value: [
            { id: 'model-1', name: 'Model 1', contextWindow: 4096 },
            { id: 'model-2', name: 'Model 2', contextWindow: 8192 },
          ],
        }),
      },
      settings: {
        describe: async () => ({
          ok: true,
          value: {
            writable: true,
            hasDocument: true,
            namespaces: [
              { ns: 'llm-pi-ai', revision: 1 },
              { ns: 'llm-deepseek', revision: 2 },
            ],
          },
        }),
        mutate: async (ns, ops, expectedRevision) => ({
          ok: true,
          value: { ns, revision: (expectedRevision ?? 0) + 1 },
        }),
      },
      credentials: {
        describe: async (refs) => ({
          ok: true,
          value: {
            DEEPSEEK_API_KEY: { configured: true },
            OPENAI_API_KEY: { configured: false },
          },
        }),
        set: async (ref, value) => ({ ok: true, value: undefined }),
        unset: async (ref) => ({ ok: true, value: undefined }),
      },
      ...overrides.remote,
    },
  }
}

test('llm.providers joins declared configurable providers with registered routes', async () => {
  const ctx = createMockCtx()
  const api = createModelApi(ctx)

  const envelope = await api.llm.providers()
  assert.equal(envelope.result.ok, true)

  const providers = envelope.result.value.providers
  assert.equal(providers.length, 4)

  // First: declared deepseek (active = true because it is in listProviders)
  const deepseek = providers.find((p) => p.provider === 'deepseek')
  assert.ok(deepseek)
  assert.equal(deepseek.displayName, 'DeepSeek Built-in')
  assert.equal(deepseek.active, true)
  assert.equal(deepseek.declared, false)
  assert.deepEqual(deepseek.settingsPath, ['providers', 'deepseek'])

  // Second: declared custom-gate (active = false because not in listProviders)
  const customGate = providers.find((p) => p.provider === 'custom-gate')
  assert.ok(customGate)
  assert.equal(customGate.displayName, 'Custom Gateway')
  assert.equal(customGate.active, false)
  assert.equal(customGate.declared, true)

  // Third & Fourth: registered routes not in declared list (custom-extra, openai)
  const customExtra = providers.find((p) => p.provider === 'custom-extra')
  assert.ok(customExtra)
  assert.equal(customExtra.displayName, 'Custom Extra')
  assert.equal(customExtra.active, true)
  assert.equal(customExtra.settingsNs, '')

  const openai = providers.find((p) => p.provider === 'openai')
  assert.ok(openai)
  assert.equal(openai.displayName, 'OpenAI')
  assert.equal(openai.active, true)
  assert.equal(openai.settingsNs, '')
})

test('llm.providers propagates errors from remote methods', async () => {
  const ctx = createMockCtx({
    remote: {
      llm: {
        listProviders: async () => ({
          ok: false,
          error: { message: 'Network offline' },
        }),
        listConfigurableProviders: async () => ({ ok: true, value: [] }),
      },
    },
  })
  const api = createModelApi(ctx)
  const envelope = await api.llm.providers()
  assert.equal(envelope.result.ok, false)
  assert.equal(envelope.result.error.message, 'Network offline')
})

test('llm.discoverModels extracts settingsNs and forwards discovery request', async () => {
  let capturedNs
  let capturedRequest
  const ctx = createMockCtx({
    remote: {
      llm: {
        discoverModels: async (ns, req) => {
          capturedNs = ns
          capturedRequest = req
          return {
            ok: true,
            value: [{ id: 'qwen-turbo', name: 'Qwen Turbo' }],
          }
        },
      },
    },
  })
  const api = createModelApi(ctx)
  const envelope = await api.llm.discoverModels({
    settingsNs: 'llm-custom-ns',
    provider: 'qwen',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    api: 'openai-completions',
    apiKey: 'sk-test-key',
  })

  assert.equal(capturedNs, 'llm-custom-ns')
  assert.deepEqual(capturedRequest, {
    provider: 'qwen',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    api: 'openai-completions',
    apiKey: 'sk-test-key',
  })
  assert.equal(envelope.result.ok, true)
  assert.deepEqual(envelope.result.value, {
    models: [{ id: 'qwen-turbo', name: 'Qwen Turbo' }],
  })
})

test('settings.describe and settings.mutate delegate cleanly', async () => {
  let mutatedArgs
  const ctx = createMockCtx({
    remote: {
      settings: {
        describe: async () => ({
          ok: true,
          value: { writable: true, namespaces: [{ ns: 'llm-pi-ai', revision: 5 }] },
        }),
        mutate: async (ns, ops, expectedRevision) => {
          mutatedArgs = { ns, ops, expectedRevision }
          return { ok: true, value: { ns, revision: 6 } }
        },
      },
    },
  })
  const api = createModelApi(ctx)

  const describeEnv = await api.settings.describe()
  assert.equal(describeEnv.result.ok, true)
  assert.equal(describeEnv.result.value.writable, true)

  const mutateEnv = await api.settings.mutate({
    ns: 'llm-pi-ai',
    ops: [{ op: 'set', path: ['providers', 'test'], value: {} }],
    expectedRevision: 5,
  })
  assert.equal(mutateEnv.result.ok, true)
  assert.deepEqual(mutatedArgs, {
    ns: 'llm-pi-ai',
    ops: [{ op: 'set', path: ['providers', 'test'], value: {} }],
    expectedRevision: 5,
  })
})

test('credentials describe, set, and unset forward parameters and return expected shape', async () => {
  let describedRefs
  let setRef, setValue
  let unsetRef
  const ctx = createMockCtx({
    remote: {
      credentials: {
        describe: async (refs) => {
          describedRefs = refs
          return { ok: true, value: { MY_KEY: { configured: true } } }
        },
        set: async (ref, value) => {
          setRef = ref
          setValue = value
          return { ok: true, value: undefined }
        },
        unset: async (ref) => {
          unsetRef = ref
          return { ok: true, value: undefined }
        },
      },
    },
  })
  const api = createModelApi(ctx)

  // describe with { refs: ['MY_KEY'] }
  const describeEnv = await api.credentials.describe({ refs: ['MY_KEY'] })
  assert.deepEqual(describedRefs, ['MY_KEY'])
  assert.equal(describeEnv.result.ok, true)
  // Both value.credentials[key] and value[key] are accessible
  assert.deepEqual(describeEnv.result.value.credentials.MY_KEY, { configured: true })
  assert.deepEqual(describeEnv.result.value.MY_KEY, { configured: true })

  // set with { ref, value }
  const setEnv = await api.credentials.set({ ref: 'MY_KEY', value: 'secret123' })
  assert.equal(setEnv.result.ok, true)
  assert.equal(setRef, 'MY_KEY')
  assert.equal(setValue, 'secret123')

  // unset with { ref }
  const unsetEnv = await api.credentials.unset({ ref: 'MY_KEY' })
  assert.equal(unsetEnv.result.ok, true)
  assert.equal(unsetRef, 'MY_KEY')
})
