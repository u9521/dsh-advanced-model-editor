import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as i18n from '../src/client/i18n.ts'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const BUNDLE = 'lib/client.js'
const SRC_FILES = ['core', 'controls', 'models', 'providers', 'i18n', 'page', 'index']

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

test('core and i18n modules load directly as TypeScript ESM', async () => {
  const core = await import('../src/client/core.ts')
  for (const name of ['SETTINGS_NS', 'OFFICIAL_NS', 'LOCALE_NS', 'PROFILE_FIELDS', 'tr', 'setTranslator', 'validateProfile', 'validateOfficialProfile', 'validateRetryPolicy', 'buildProfileOps', 'initialEditorState', 'groupProviderRows', 'deleteProviderOps']) {
    assert.ok(name in core, `core should export ${name}`)
  }
  assert.equal(typeof i18n.flattenDictionary, 'function')
  assert.equal(typeof i18n.zh, 'object')
  assert.equal(typeof i18n.en, 'object')
})

test('src modules declare their focused contracts and stay free of hardcoded Chinese', () => {
  const contracts = {
    'controls.ts': ['Field', 'TextInput', 'Select', 'ProtocolSelect', 'Modalities', 'KeyValueList', 'CompatEditor', 'RetryPolicy', 'CSS'],
    'models.ts': ['ModelForm', 'ModelDiscoveryDialog', 'ModelList', 'OfficialModelList'],
    'providers.ts': ['ProviderEditor', 'CreateCustomProvider', 'AddBuiltInProvider', 'OfficialProviderEditor'],
    'page.ts': ['AdvancedModelsPage', 'LocalePage'],
    'index.ts': ['inject', 'apply'],
  }
  for (const [file, names] of Object.entries(contracts)) {
    const text = source(`src/client/${file}`)
    for (const name of names) {
      const pattern = name === 'inject' || name === 'CSS' ? new RegExp(`export const ${name}\\b`) : new RegExp(`export (function|const) ${name}\\b`)
      assert.match(text, pattern, `${file} should export ${name}`)
    }
  }
  for (const file of ['core.ts', 'controls.ts', 'models.ts', 'providers.ts']) assert.doesNotMatch(source(`src/client/${file}`), /[\u3400-\u9fff]/, file)
})

test('src modules use relative ESM imports with an acyclic dependency graph', () => {
  const edges = {}
  for (const name of SRC_FILES) {
    const text = source(`src/client/${name}.ts`)
    const imports = [...text.matchAll(/^import \* as \w+ from ["']\.\/([a-z0-9-]+)\.ts["'];?$/gm)].map((match) => match[1])
    for (const dep of imports) assert.ok(SRC_FILES.includes(dep), `${name} imports unknown ${dep}`)
    edges[name] = imports
    assert.doesNotMatch(text, /require\('@local\/dsh-advanced-model-editor\//, name)
  }
  assert.deepEqual(edges.core, [])
  assert.deepEqual(edges.controls, ['core'])
  assert.deepEqual(edges.models, ['core', 'controls'])
  assert.deepEqual(edges.providers, ['core', 'controls', 'models'])
  assert.deepEqual(edges.page, ['core', 'providers'])
  assert.deepEqual(edges.index, ['core', 'controls', 'i18n', 'page'])
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
  const zh = leaves(i18n.zh)
  const en = leaves(i18n.en)
  assert.deepEqual([...zh.keys()].sort(), [...en.keys()].sort())
  for (const [path, value] of zh) {
    assert.equal(typeof value, 'string', `zh ${path}`)
    assert.equal(typeof en.get(path), 'string', `en ${path}`)
  }
})

test('modular styles use dark-mode theme tokens and remove prompt divider', () => {
  const css = source('src/client/controls.ts').match(/export const CSS = `([\s\S]*?)`/)[1]
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

