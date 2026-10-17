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
        discoverModels: async (_settingsNs, _request) => ({
          ok: true,
          value: [
            { id: 'model-1', name: 'Model 1', contextWindow: 4096 },
            { id: 'model-2', name: 'Model 2', contextWindow: 8192 },
          ],
        }),
      },
      credentials: {
        describe: async (_refs) => ({
          ok: true,
          value: {
            DEEPSEEK_API_KEY: { configured: true },
            OPENAI_API_KEY: { configured: false },
          },
        }),
        set: async (_ref, _value) => ({ ok: true, value: undefined }),
        unset: async (_ref) => ({ ok: true, value: undefined }),
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

test('the adapter exposes no settings transport of its own', () => {
  // DSH 0.2.1 made ctx.configForms the only describe reader and the only
  // revision queue, so a page-level settings transport would bypass both.
  const api = createModelApi(createMockCtx())
  assert.equal(api.settings, undefined)
  assert.deepEqual(Object.keys(api).sort(), ['credentials', 'llm'])
})

test('llm.providers forwards the DSH 0.2.1 directory facts', async () => {
  const ctx = createMockCtx({
    remote: {
      llm: {
        listProviders: async () => ({ ok: true, value: [] }),
        listConfigurableProviders: async () => ({
          ok: true,
          value: [
            {
              provider: 'anthropic',
              displayName: 'Anthropic',
              settingsNs: 'llm-pi-ai',
              settingsPath: ['providers', 'anthropic'],
              defaultBaseURL: 'https://api.anthropic.com',
              baseURLEnv: ['ANTHROPIC_BASE_URL'],
              nativeAuth: { env: ['ANTHROPIC_API_KEY'], oauth: true },
              error: 'catalog drift',
            },
          ],
        }),
      },
    },
  })
  const api = createModelApi(ctx)
  const providers = (await api.llm.providers()).result.value.providers
  assert.deepEqual(providers[0], {
    provider: 'anthropic',
    displayName: 'Anthropic',
    settingsNs: 'llm-pi-ai',
    settingsPath: ['providers', 'anthropic'],
    active: false,
    defaultBaseURL: 'https://api.anthropic.com',
    baseURLEnv: ['ANTHROPIC_BASE_URL'],
    nativeAuth: { env: ['ANTHROPIC_API_KEY'], oauth: true },
    error: 'catalog drift',
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

  // describe with ['MY_KEY']
  const describeEnv = await api.credentials.describe(['MY_KEY'])
  assert.deepEqual(describedRefs, ['MY_KEY'])
  assert.equal(describeEnv.result.ok, true)
  assert.deepEqual(describeEnv.result.value.MY_KEY, { configured: true })

  // set with { ref, value }
  const setEnv = await api.credentials.set({
    ref: 'MY_KEY',
    value: 'secret123',
  })
  assert.equal(setEnv.result.ok, true)
  assert.equal(setRef, 'MY_KEY')
  assert.equal(setValue, 'secret123')

  // unset with { ref }
  const unsetEnv = await api.credentials.unset({ ref: 'MY_KEY' })
  assert.equal(unsetEnv.result.ok, true)
  assert.equal(unsetRef, 'MY_KEY')
})
