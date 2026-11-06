import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as locales from '../src/client/locales/index.ts'
import * as iconMark from '../src/client/icon.ts'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const BUNDLE = 'lib/client.js'

function source(relative) {
  return readFileSync(join(root, relative), 'utf8')
}

function stubReact() {
  return {
    Fragment: 'Fragment',
    createElement: (type, props, ...children) => ({
      type,
      props: props || {},
      children,
    }),
    useState: (value) => [
      typeof value === 'function' ? value() : value,
      () => {},
    ],
    useEffect: () => {},
    useMemo: (factory) => factory(),
    useSyncExternalStore: (_subscribe, snapshot) => snapshot(),
  }
}

function loadBundle() {
  const factories = new Map()
  const window = {
    __ModuleLoader__: {
      load: (handoff) => factories.set(handoff.id, handoff.factory),
    },
  }
  new Function('window', source(BUNDLE))(window)
  const external = new Map([
    ['react', stubReact()],
    [
      '@deepseek-ai/dsh-client-ui-primitives',
      {
        Modal: 'Modal',
        IconCloseOutlineRegular: 'IconCloseOutlineRegular',
        IconPlusOutlineRegular: 'IconPlusOutlineRegular',
        IconRefreshOutlineRegular: 'IconRefreshOutlineRegular',
        IconCopyOutlineRegular: 'IconCopyOutlineRegular',
      },
    ],
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
    if (value !== null && typeof value === 'object' && !Array.isArray(value))
      leaves(value, path, result)
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
  assert.deepEqual(client.inject, [
    'slots',
    'locale',
    'remote',
    'remote.credentials',
    'remote.llm',
    'configForms',
    'settingsSchema',
  ])
  assert.equal(typeof client.apply, 'function')
})

test('constants, i18n, utils, state, validation and locales load directly as TypeScript ESM', async () => {
  const constants = await import('../src/client/constants.ts')
  const i18n = await import('../src/client/i18n.ts')
  const utils = await import('../src/client/utils.ts')
  const state = await import('../src/client/state.ts')
  const validation = await import('../src/client/validation.ts')
  const localesMod = await import('../src/client/locales/index.ts')

  for (const name of [
    'SETTINGS_NS',
    'OFFICIAL_NS',
    'LOCALE_NS',
    'PROFILE_FIELDS',
    'THINKING_TOKEN_BUDGET_FIELDS',
  ]) {
    assert.ok(name in constants, `constants should export ${name}`)
  }
  for (const name of ['tr', 'setTranslator']) {
    assert.ok(name in i18n, `i18n should export ${name}`)
  }
  for (const name of ['parseCapacity', 'formatCapacity']) {
    assert.ok(name in utils, `utils should export ${name}`)
  }
  for (const name of [
    'initialEditorState',
    'hasUserProfile',
    'stripModelCompat',
    'discoveredModelProfile',
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
    'icon.ts': ['MARK_PATH', 'MARK_STROKE'],
    'compat.ts': [
      'COMPAT_FIELDS',
      'COMPAT_PROTOCOL_FIELDS',
      'compatFields',
      'compatValueConfigured',
      'filterCompatForProtocol',
    ],
    'commit.ts': ['commit', 'removeProfile', 'outcomeMessage', 'diffProfile'],
    'plan.ts': ['planSave', 'planReplace'],
    'styles.ts': ['CSS'],
    'models/discovery-dialog.ts': ['ModelDiscoveryDialog'],
    'models/model-list.ts': ['ModelList', 'uniqueCopyId'],
    'models/model-fields.ts': [
      'PI_AI_MODEL_FIELDS',
      'OFFICIAL_MODEL_FIELDS',
      'ModelFields',
    ],
    'providers/provider-editor.ts': ['ProviderEditor'],
    'providers/custom-provider.ts': ['CreateCustomProvider'],
    'providers/builtin-provider.ts': ['AddBuiltInProvider'],
    'providers/official-editor.ts': ['OfficialProviderEditor'],
    'api.ts': ['createModelApi'],
    'settings.ts': [
      'namespaceView',
      'ensureDescribe',
      'writeOps',
      'conflictMessage',
      'objectFields',
      'unionValues',
      'dictKeys',
    ],
    'choices.ts': [
      'protocolChoices',
      'reasoningLevelChoices',
      'profileFieldChoices',
      'officialFieldChoices',
      'adoptSchemaChoices',
      'resetSchemaChoices',
    ],
    'page.ts': ['AdvancedModelsPage', 'LocalePage'],
    'index.ts': ['inject', 'apply'],
  }
  for (const [file, names] of Object.entries(contracts)) {
    const text = source(`src/client/${file}`)
    for (const name of names) {
      const pattern =
        name === 'inject' || name === 'CSS'
          ? new RegExp(`export const ${name}\\b`)
          : new RegExp(`export (async function|function|const) ${name}\\b`)
      assert.match(text, pattern, `${file} should export ${name}`)
    }
  }
  const nonLocaleFiles = [
    'constants.ts',
    'types.ts',
    'i18n.ts',
    'icon.ts',
    'utils.ts',
    'state.ts',
    'validation.ts',
    'styles.ts',
    'api.ts',
    'settings.ts',
    'choices.ts',
    'controls/field.ts',
    'controls/inputs.ts',
    'controls/modalities.ts',
    'controls/key-value-list.ts',
    'controls/compat-editor.ts',
    'controls/reasoning-efforts-editor.ts',
    'controls/retry-policy.ts',
    'controls/index.ts',
    'compat.ts',
    'commit.ts',
    'plan.ts',
    'models/discovery-dialog.ts',
    'models/model-list.ts',
    'models/model-fields.ts',
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
    'i18n.ts',
    'icon.ts',
    'utils.ts',
    'state.ts',
    'validation.ts',
    'styles.ts',
    'api.ts',
    'settings.ts',
    'choices.ts',
    'controls/field.ts',
    'controls/inputs.ts',
    'controls/modalities.ts',
    'controls/key-value-list.ts',
    'controls/compat-editor.ts',
    'controls/reasoning-efforts-editor.ts',
    'controls/retry-policy.ts',
    'controls/index.ts',
    'compat.ts',
    'commit.ts',
    'plan.ts',
    'models/discovery-dialog.ts',
    'models/model-list.ts',
    'models/model-fields.ts',
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
  // The name promises the graph is acyclic, so walk it: a cycle only shows up
  // as an import-order-dependent ReferenceError at runtime, which is exactly
  // the failure this test should catch before the bundle ships.
  const graph = new Map()
  for (const file of allClientFiles) {
    const base = dirname(file)
    const deps = [
      ...source(`src/client/${file}`).matchAll(/from '(\.\/[^']+)'/g),
    ]
      .map((match) => join(base, match[1]).replace(/\\/g, '/'))
      .filter((dep) => dep !== file && allClientFiles.includes(dep))
    graph.set(file, [...new Set(deps)])
  }
  const state = new Map()
  const cycles = []
  const visit = (node, stack) => {
    const seen = state.get(node)
    if (seen === 'done') return
    if (seen === 'visiting') {
      const start = stack.indexOf(node)
      if (start >= 0) cycles.push([...stack.slice(start), node].join(' -> '))
      return
    }
    state.set(node, 'visiting')
    for (const dep of graph.get(node) ?? []) visit(dep, [...stack, dep])
    state.set(node, 'done')
  }
  for (const file of allClientFiles) visit(file, [file])
  assert.deepEqual([...new Set(cycles)], [], 'import cycle')
})

test('main plugin registers locale dictionaries and the additive settings section', () => {
  const { require } = loadBundle()
  const client = require('@local/dsh-advanced-model-editor')
  let injected
  let registered
  let dictionaries
  const locale = {
    register: (_ns, next) => {
      dictionaries = next
      return () => {}
    },
    bind: () => (key) => (key === 'nav' ? 'Advanced Model Configuration' : key),
    subscribe: () => () => {},
  }
  const describe = {
    getSnapshot: () => ({
      status: 'ready',
      view: {
        namespaces: [
          { ns: 'llm-pi-ai', schema: {}, value: {}, revision: 1 },
          { ns: 'llm-deepseek', schema: {}, value: {}, revision: 2 },
        ],
        writable: true,
        hasDocument: true,
      },
      error: null,
    }),
    subscribe: () => () => {},
    ensure: async () => {},
  }
  let served
  const ctx = {
    effect: (effect) => effect(),
    remote: {
      $on: () => () => {},
      llm: {
        listProviders: async () => ({ ok: true, value: [] }),
        listConfigurableProviders: async () => ({ ok: true, value: [] }),
        discoverModels: async () => ({ ok: true, value: [] }),
      },
      credentials: {
        describe: async () => ({ ok: true, value: {} }),
        set: async () => ({ ok: true }),
        unset: async () => ({ ok: true }),
      },
    },
    configForms: {
      describe: () => describe,
      get: () => ({ mutate: async () => true }),
      whileServed: (namespaces, register) => {
        served = { namespaces, register }
        return register(new Set(namespaces))
      },
    },
    settingsSchema: {
      rehydrate: (value) => value,
      nodeAtPath: () => undefined,
    },
    locale,
    on: () => () => {},
    slots: {
      // Two slots are declared now: the section itself and the nav glyph that
      // addresses it by id. The fake records one registration per slot name.
      inject: (name, callback) => {
        injected ??= []
        injected.push({ name, callback })
      },
      register: (options, component) => {
        registered ??= []
        registered.push({ options, component })
        return () => {}
      },
    },
  }
  global.document = {
    createElement: () => ({ dataset: {}, remove() {} }),
    head: { appendChild() {} },
  }
  client.apply(ctx)
  assert.ok(dictionaries.zh && dictionaries.en)
  assert.equal(dictionaries.zh.nav, '模型高级配置')
  assert.equal(dictionaries.en.nav, 'Advanced Model Configuration')
  // Both contributions depend on the shell having declared their target slot
  // first, so each arrives through slots.inject in registration order.
  assert.deepEqual(
    injected.map((entry) => entry.name),
    ['settings.section.icon', 'settings.section'],
  )
  for (const entry of injected) entry.callback()
  const icon = registered.find(
    (entry) => entry.options.name === 'settings.section.icon',
  )
  const section = registered.find(
    (entry) => entry.options.name === 'settings.section',
  )
  // The nav glyph is addressed by the section id, so the shell can render it
  // inline with the label and fall back to its own glyph for unknown ids.
  assert.equal(icon.options.id, 'model-advanced')
  assert.equal(icon.options.order, 11)
  // The icon's label is never displayed; the section owns the accessible text.
  assert.equal(icon.options.label, undefined)
  assert.equal(section.options.id, icon.options.id)
  const rendered = icon.component({ size: 16, active: true })
  assert.equal(rendered.type, 'svg')
  assert.equal(rendered.props.viewBox, '0 0 24 24')
  assert.equal(rendered.props.width, 16)
  assert.equal(rendered.props.height, 16)
  assert.equal(rendered.props.fill, 'none')
  // The stub createElement keeps children on the element, not in props.
  const [path] = rendered.children
  assert.equal(path.props.d, iconMark.MARK_PATH)
  assert.equal(path.props.stroke, 'currentColor')
  assert.equal(path.props.strokeWidth, iconMark.MARK_STROKE)
  assert.equal(path.props.strokeLinecap, 'round')
  assert.equal(path.props.strokeLinejoin, 'round')
  // The section exists only while an LLM adapter namespace is served.
  assert.deepEqual(served.namespaces, ['llm-pi-ai', 'llm-deepseek'])
  assert.equal(section.options.id, 'model-advanced')
  assert.equal(section.options.label(), 'Advanced Model Configuration')
  assert.equal(typeof section.component, 'function')
  delete global.document
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
  const css = source('src/client/styles.ts').match(
    /export const CSS = `([\s\S]*?)`/,
  )[1]
  for (const token of [
    '--dsw-alias-bg-layer-1',
    '--dsw-alias-bg-layer-2',
    '--dsw-alias-label-primary',
    '--dsw-alias-label-secondary',
    '--dsw-alias-border-l1',
    '--dsw-alias-border-l2',
    '--dsw-alias-brand-primary',
  ])
    assert.match(css, new RegExp(token.replaceAll('-', '\\-')))
  assert.doesNotMatch(css, /border-radius:(?:[1-9][0-9]|9)px/)
  assert.match(css, /dsh-ma-delete-confirm \.dsh-ma-actions\{border-top:0/)
})

test('dist packaging workflow copies runtime JS plus the display metadata', () => {
  const workflow = source('.github/workflows/dist.yml')
  // Verifies that only lib/index.js and lib/client.js are copied
  assert.match(workflow, /cp lib\/index\.js lib\/client\.js \.dist\/lib\//)
  assert.doesNotMatch(workflow, /cp -r lib\/\* \.dist\/lib\//)
  // The localized name and the icon are what make the installed plugin read as
  // 模型高级配置 rather than its package name, so the dist package ships both.
  assert.match(workflow, /cp -r locale \.dist\/locale/)
  assert.match(workflow, /cp icon\.svg \.dist\/icon\.svg/)
  assert.match(workflow, /"\.\/locale\/\*\.json": "\.\/locale\/\*\.json"/)
  assert.match(workflow, /"\.\/icon": "\.\/icon\.svg"/)
  assert.match(workflow, /files: \["lib", "locale", "icon\.svg"/)
  // CI and the package's own engines both promise Node 24 or newer.
  assert.match(workflow, /node-version: 26/)
  // Verifies that no .gitignore is written to .dist
  assert.doesNotMatch(workflow, /\.dist\/\.gitignore/)
  // Verifies that dist package.json does not declare types
  assert.doesNotMatch(workflow, /types:\s*pkg\.types/)
})

test('the official editor states its listing posture and offers the way back', () => {
  const editor = source('src/client/providers/official-editor.ts')
  // The banner is driven by one classifier, never by an ad-hoc comparison in
  // the component.
  assert.match(editor, /listingFollow\(namespace\?\.user, builtInCatalog\)/)
  assert.match(editor, /dsh-ma-listing-\$\{listing\}/)
  // Restoring is the same ordered commit the form uses, so the conflict and
  // credential-failure rules cannot drift between the two paths.
  assert.match(editor, /ops: restoreDefaultOps\(\[\]\)/)
  assert.match(editor, /outcomeMessage\(outcome\)/)
  // The listing copy exists in both dictionaries under the same three keys.
  for (const key of ['following', 'customized', 'not-applicable', 'restore']) {
    assert.ok(
      locales.en.listing[key] !== undefined,
      `en.listing.${key} missing`,
    )
    assert.ok(
      locales.zh.listing[key] !== undefined,
      `zh.listing.${key} missing`,
    )
  }
})

test('the nav glyph is a slot contribution, not a DOM rewrite', () => {
  const index = source('src/client/index.ts')
  assert.match(index, /ctx\.slots\.inject\('settings\.section\.icon'/)
  assert.match(index, /name: 'settings\.section\.icon'/)
  assert.match(index, /id: 'model-advanced'/)
  // The DOM scan and its observer are gone; anything resembling them coming
  // back is a regression to the fragile path DSH 0.2.2 replaced.
  assert.doesNotMatch(index, /MutationObserver/)
  assert.doesNotMatch(index, /querySelectorAll\('button'\)/)
  assert.doesNotMatch(index, /replaceWith\(/)
})
