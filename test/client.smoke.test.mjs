import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as locales from '../src/client/locales/index.ts'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const BUNDLE = 'lib/client.js'

function source(relative) {
  return readFileSync(join(root, relative), 'utf8')
}

function stubReact() {
  return {
    Fragment: 'Fragment',
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
    useState: (value) => [typeof value === 'function' ? value() : value, () => {}],
    useEffect: () => {},
    useSyncExternalStore: (_subscribe, snapshot) => snapshot(),
  }
}

function loadBundle() {
  const factories = new Map()
  const window = { __ModuleLoader__: { load: (handoff) => factories.set(handoff.id, handoff.factory) } }
  // eslint-disable-next-line no-new-func
  new Function('window', source(BUNDLE))(window)
  const external = new Map([
    ['react', stubReact()],
    ['@deepseek-ai/dsh-client-ui-primitives', {
      Modal: 'Modal',
      IconCloseOutline16: 'IconCloseOutline16',
      IconPlusOutline16: 'IconPlusOutline16',
      IconRefreshOutline16: 'IconRefreshOutline16',
      IconCopyOutline16: 'IconCopyOutline16',
    }],
  ])
  const cache = new Map()
  const require = (id) => {
    if (external.has(id)) return external.get(id)
    if (cache.has(id)) return cache.get(id)
    const factory = factories.get(id)
    if (factory === undefined) throw new Error(`unexpected module ${id}`)
    const value = factory(require)
    cache.set(id, value)
    return value
  }
  return { require, factories }
}

function leaves(dictionary, prefix = '', result = new Map()) {
  for (const [key, value] of Object.entries(dictionary)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) leaves(value, path, result)
    else result.set(path, value)
  }
  return result
}

test('built bundle keeps a single injection point registering the package', () => {
  const { factories } = loadBundle()
  assert.deepEqual([...factories.keys()], ['@local/dsh-advanced-model-editor'])
})

test('built bundle materializes the plugin with the expected lifecycle contract', () => {
  const { require } = loadBundle()
  const client = require('@local/dsh-advanced-model-editor')
  assert.deepEqual(client.inject, ['slots', 'connection', 'remote', 'timer', 'locale'])
  assert.equal(typeof client.apply, 'function')
})

test('constants, utils, state, validation and locales load directly as TypeScript ESM', async () => {
  const constants = await import('../src/client/constants.ts')
  const utils = await import('../src/client/utils.ts')
  const state = await import('../src/client/state.ts')
  const validation = await import('../src/client/validation.ts')
  const localesMod = await import('../src/client/locales/index.ts')

  for (const name of [
    'SETTINGS_NS',
    'OFFICIAL_NS',
    'LOCALE_NS',
    'PROFILE_FIELDS',
  ]) {
    assert.ok(name in constants, `constants should export ${name}`)
  }
  for (const name of [
    'tr',
    'setTranslator',
    'parseCapacity',
    'formatCapacity',
  ]) {
    assert.ok(name in utils, `utils should export ${name}`)
  }
  for (const name of [
    'buildProfileOps',
    'initialEditorState',
    'groupProviderRows',
    'deleteProviderOps',
    'stripModelCompat',
  ]) {
    assert.ok(name in state, `state should export ${name}`)
  }
  for (const name of [
    'validateProfile',
    'validateOfficialProfile',
    'validateRetryPolicy',
  ]) {
    assert.ok(name in validation, `validation should export ${name}`)
  }
  assert.equal(typeof localesMod.flattenDictionary, 'function')
  assert.equal(typeof localesMod.zh, 'object')
  assert.equal(typeof localesMod.en, 'object')
})

test('src modules declare their focused contracts and stay free of hardcoded Chinese', () => {
  const contracts = {
    'controls/field.ts': ['Field'],
    'controls/inputs.ts': ['TextInput', 'Select', 'ProtocolSelect'],
    'controls/modalities.ts': ['Modalities'],
    'controls/key-value-list.ts': ['KeyValueList'],
    'controls/compat-editor.ts': ['CompatEditor'],
    'controls/reasoning-efforts-editor.ts': ['ReasoningEffortsEditor'],
    'controls/retry-policy.ts': ['RetryPolicy'],
    'styles.ts': ['CSS'],
    'models/model-form.ts': ['ModelForm'],
    'models/discovery-dialog.ts': ['ModelDiscoveryDialog'],
    'models/model-list.ts': ['ModelList'],
    'models/official-models.ts': ['OfficialModelList'],
    'providers/provider-editor.ts': ['ProviderEditor'],
    'providers/custom-provider.ts': ['CreateCustomProvider'],
    'providers/builtin-provider.ts': ['AddBuiltInProvider'],
    'providers/official-editor.ts': ['OfficialProviderEditor'],
    'page.ts': ['AdvancedModelsPage', 'LocalePage'],
    'index.ts': ['inject', 'apply'],
  }
  for (const [file, names] of Object.entries(contracts)) {
    const text = source(`src/client/${file}`)
    for (const name of names) {
      const pattern =
        name === 'inject' || name === 'CSS'
          ? new RegExp(`export const ${name}\\b`)
          : new RegExp(`export (function|const) ${name}\\b`)
      assert.match(text, pattern, `${file} should export ${name}`)
    }
  }
  const nonLocaleFiles = [
    'constants.ts',
    'types.ts',
    'utils.ts',
    'state.ts',
    'validation.ts',
    'styles.ts',
    'controls/field.ts',
    'controls/inputs.ts',
    'controls/modalities.ts',
    'controls/key-value-list.ts',
    'controls/compat-editor.ts',
    'controls/reasoning-efforts-editor.ts',
    'controls/retry-policy.ts',
    'controls/index.ts',
    'models/discovery-dialog.ts',
    'models/model-form.ts',
    'models/model-list.ts',
    'models/official-models.ts',
    'models/index.ts',
    'providers/credential-field.ts',
    'providers/provider-editor.ts',
    'providers/official-editor.ts',
    'providers/custom-provider.ts',
    'providers/builtin-provider.ts',
    'providers/index.ts',
    'locales/en.ts',
    'locales/index.ts',
    'page.ts',
    'index.ts',
  ]
  for (const file of nonLocaleFiles) {
    assert.doesNotMatch(source(`src/client/${file}`), /[\u3400-\u9fff]/, file)
  }
})

test('src modules use relative ESM imports with an acyclic dependency graph', () => {
  const allClientFiles = [
    'types.ts',
    'constants.ts',
    'utils.ts',
    'state.ts',
    'validation.ts',
    'styles.ts',
    'controls/field.ts',
    'controls/inputs.ts',
    'controls/modalities.ts',
    'controls/key-value-list.ts',
    'controls/compat-editor.ts',
    'controls/reasoning-efforts-editor.ts',
    'controls/retry-policy.ts',
    'controls/index.ts',
    'models/discovery-dialog.ts',
    'models/model-form.ts',
    'models/model-list.ts',
    'models/official-models.ts',
    'models/index.ts',
    'providers/credential-field.ts',
    'providers/provider-editor.ts',
    'providers/official-editor.ts',
    'providers/custom-provider.ts',
    'providers/builtin-provider.ts',
    'providers/index.ts',
    'locales/zh.ts',
    'locales/en.ts',
    'locales/index.ts',
    'page.ts',
    'index.ts',
  ]
  for (const file of allClientFiles) {
    const text = source(`src/client/${file}`)
    assert.doesNotMatch(
      text,
      /require\('@local\/dsh-advanced-model-editor\//,
      file,
    )
  }
})

test('main plugin registers locale dictionaries and the additive settings section', () => {
  const { require } = loadBundle()
  const client = require('@local/dsh-advanced-model-editor')
  let injected
  let registered
  let dictionaries
  const locale = {
    register: (_ns, next) => { dictionaries = next; return () => {} },
    bind: () => (key) => key === 'nav' ? 'Advanced Model Settings' : key,
    subscribe: () => () => {},
  }
  const ctx = {
    effect: (effect) => effect(),
    connection: { api: {} },
    remote: { $on: () => () => {} },
    timer: { timeout: () => () => {} },
    locale,
    on: () => () => {},
    slots: {
      inject: (name, callback) => { injected = { name, callback } },
      register: (options, component) => { registered = { options, component }; return () => {} },
    },
  }
  global.document = {
    createElement: () => ({ dataset: {}, remove() {} }),
    createElementNS: () => ({ setAttribute() {}, appendChild() {} }),
    querySelectorAll: () => [],
    querySelector: () => null,
    head: { appendChild() {} },
  }
  global.MutationObserver = class { constructor() {} observe() {} disconnect() {} }
  global.requestAnimationFrame = () => 0
  client.apply(ctx)
  assert.ok(dictionaries.zh && dictionaries.en)
  assert.equal(dictionaries.zh.nav, '模型高级设置')
  assert.equal(dictionaries.en.nav, 'Advanced Model Settings')
  assert.equal(injected.name, 'settings.section')
  injected.callback()
  assert.equal(registered.options.id, 'model-advanced')
  assert.equal(registered.options.label(), 'Advanced Model Settings')
  assert.equal(typeof registered.component, 'function')
  delete global.document
  delete global.MutationObserver
  delete global.requestAnimationFrame
})

test('host half is a no-op plugin node with an empty inject list', () => {
  const text = source('src/index.ts')
  assert.match(text, /export const inject: readonly string\[\] = \[\]/)
  assert.match(text, /export function apply\(/)
  assert.match(text, /from '@deepseek-ai\/cordis'/)
})

test('zh and en dictionaries expose identical leaf paths', () => {
  const zh = leaves(locales.zh)
  const en = leaves(locales.en)
  assert.deepEqual([...zh.keys()].sort(), [...en.keys()].sort())
  for (const [path, value] of zh) {
    assert.equal(typeof value, 'string', `zh ${path}`)
    assert.equal(typeof en.get(path), 'string', `en ${path}`)
  }
})

test('modular styles use dark-mode theme tokens and remove prompt divider', () => {
  const css = source('src/client/styles.ts').match(/export const CSS = `([\s\S]*?)`/)[1]
  for (const token of [
    '--dsw-alias-bg-layer-1',
    '--dsw-alias-bg-layer-2',
    '--dsw-alias-label-primary',
    '--dsw-alias-label-secondary',
    '--dsw-alias-border-l1',
    '--dsw-alias-border-l2',
    '--dsw-alias-brand-primary',
  ]) assert.match(css, new RegExp(token.replaceAll('-', '\\-')))
  assert.doesNotMatch(css, /border-radius:(?:[1-9][0-9]|9)px/)
  assert.match(css, /dsh-ma-delete-confirm \.dsh-ma-actions\{border-top:0/)
})

test('dist packaging workflow copies only runtime JS and excludes types, maps, and .gitignore', () => {
  const workflow = source('.github/workflows/dist.yml')
  // Verifies that only lib/index.js and lib/client.js are copied
  assert.match(workflow, /cp lib\/index\.js lib\/client\.js \.dist\/lib\//)
  assert.doesNotMatch(workflow, /cp -r lib\/\* \.dist\/lib\//)
  // Verifies that no .gitignore is written to .dist
  assert.doesNotMatch(workflow, /\.dist\/\.gitignore/)
  // Verifies that dist package.json does not declare types
  assert.doesNotMatch(workflow, /types:\s*pkg\.types/)
})


