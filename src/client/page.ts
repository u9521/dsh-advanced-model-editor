import * as React from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import * as core from './core.ts'
import * as providers from './providers.ts'

export interface AdvancedModelsPageProps {
  api: core.ModelApi
  retryLater: (callback: () => void, delay: number) => () => void
  timeout: (callback: () => void, delay: number) => () => void
  subscribe: (refresh: () => void) => () => void
}

export interface LocaleService {
  bind(namespace: string): core.Translator
  subscribe(callback: () => void): () => void
}

export interface LocalePageProps {
  locale: LocaleService
  api: core.ModelApi
  retryLater: (callback: () => void, delay: number) => () => void
  timeout: (callback: () => void, delay: number) => () => void
  subscribe: (refresh: () => void) => () => void
}

const e = React.createElement
const NS = core.LOCALE_NS
export function AdvancedModelsPage({
  api,
  retryLater,
  timeout,
  subscribe,
}: AdvancedModelsPageProps) {
  const [state, setState] = React.useState<{
    status: 'idle' | 'loading' | 'ready' | 'waiting' | 'error'
    writable: boolean
    rows: core.ProviderRow[]
    catalogRows: core.ProviderRow[]
    namespace: core.SettingsNamespaceView | undefined
    officialNamespace: core.SettingsNamespaceView | undefined
    error: string
  }>({
    status: 'idle',
    writable: false,
    rows: [],
    catalogRows: [],
    namespace: undefined,
    officialNamespace: undefined,
    error: '',
  })
  const [createMode, setCreateMode] = React.useState<
    'builtin' | 'custom' | undefined
  >(undefined)
  const load = async () => {
    setState((current) =>
      current.status === 'waiting'
        ? { ...current, error: '' }
        : { ...current, status: 'loading', error: '' },
    )
    try {
      const [providerResponse, settingsResponse] = await Promise.all([
        api.llm.providers({}),
        api.settings.describe({}),
      ])
      const providerList = core.valueOf<{
        providers: Array<{
          provider: string
          displayName: string
          settingsNs: string
          settingsPath: string[]
          active?: boolean
          declared?: boolean
        }>
      }>(providerResponse).providers
      const settings = core.valueOf<{
        namespaces: core.SettingsNamespaceView[]
        writable?: boolean
      }>(settingsResponse)
      const namespace = settings.namespaces.find(
        (entry) => entry.ns === core.SETTINGS_NS,
      )
      const officialNamespace = settings.namespaces.find(
        (entry) => entry.ns === core.OFFICIAL_NS,
      )
      if (!namespace || !officialNamespace) {
        setState((current) => ({
          ...current,
          status: 'waiting',
          error: '',
        }))
        return false
      }
      const catalogRows = providerList
        .filter((entry) => entry.settingsNs === core.SETTINGS_NS)
        .map((entry) => ({
          ...entry,
          api,
          userAdded: core.hasUserProfile(namespace, entry.settingsPath),
        }))
      setState({
        status: 'ready',
        writable: settings.writable === true,
        rows: catalogRows.filter((entry) => entry.userAdded),
        catalogRows,
        namespace,
        officialNamespace,
        error: '',
      })
      return true
    } catch (error) {
      setState((current) => ({
        ...current,
        status: 'error',
        error: core.responseMessage(error),
      }))
      return true
    }
  }
  React.useEffect(() => {
    let active = true
    let cancelRetry: (() => void) | undefined
    const attempt = async () => {
      const settled = await load()
      if (!settled && active) cancelRetry = retryLater(attempt, 250)
    }
    attempt()
    const dispose = subscribe(() => {
      if (active) load()
    })
    return () => {
      active = false
      if (cancelRetry) cancelRetry()
      dispose()
    }
  }, [])
  const editorProps = (row: core.ProviderRow) => ({
    key: row.provider,
    row: { ...row, userAdded: true },
    namespace: state.namespace!,
    writable: state.writable,
    reload: load,
    timeout,
  })
  return e(
    'div',
    { className: 'dsh-ma-page' },
    e(
      'div',
      { className: 'dsh-ma-header' },
      e('h2', { className: 'dsh-ma-title' }, core.tr('title')),
      e(
        'div',
        { className: 'dsh-ma-toolbar' },
        e(
          'button',
          {
            type: 'button',
            className: 'dsh-ma-button',
            disabled: state.status === 'loading',
            title: core.tr('refresh'),
            'aria-label': core.tr('refresh'),
            onClick: load,
          },
          e(primitives.IconRefreshOutline16, { size: 16 }),
        ),
        e(
          'button',
          {
            type: 'button',
            className: 'dsh-ma-button',
            disabled: !state.writable || state.status !== 'ready',
            onClick: () =>
              setCreateMode((value) =>
                value === 'builtin' ? undefined : 'builtin',
              ),
          },
          e(primitives.IconPlusOutline16, { size: 14 }),
          core.tr('addBuiltIn'),
        ),
        e(
          'button',
          {
            type: 'button',
            className: 'dsh-ma-button',
            disabled: !state.writable || state.status !== 'ready',
            onClick: () =>
              setCreateMode((value) =>
                value === 'custom' ? undefined : 'custom',
              ),
          },
          e(primitives.IconPlusOutline16, { size: 14 }),
          core.tr('addCustom'),
        ),
      ),
    ),
    !state.writable && state.status === 'ready'
      ? e('div', { className: 'dsh-ma-notice' }, core.tr('readOnly'))
      : null,
    state.status === 'loading'
      ? e('p', { className: 'dsh-ma-status' }, core.tr('loading'))
      : null,
    state.status === 'waiting'
      ? e('p', { className: 'dsh-ma-status' }, core.tr('waiting'))
      : null,
    state.status === 'error'
      ? e(
          'p',
          { className: 'dsh-ma-status dsh-ma-error', role: 'alert' },
          state.error,
        )
      : null,
    createMode === 'builtin' && state.namespace
      ? e(providers.AddBuiltInProvider, {
          namespace: state.namespace,
          rows: state.catalogRows,
          api,
          writable: state.writable,
          reload: load,
          close: () => setCreateMode(undefined),
        })
      : null,
    createMode === 'custom' && state.namespace
      ? e(providers.CreateCustomProvider, {
          namespace: state.namespace,
          rows: state.catalogRows,
          api,
          writable: state.writable,
          reload: load,
          close: () => setCreateMode(undefined),
        })
      : null,
    e(
      'div',
      { className: 'dsh-ma-list' },
      e(
        'h3',
        { className: 'dsh-ma-section-title' },
        core.tr('builtInProviders'),
      ),
      state.officialNamespace
        ? e(providers.OfficialProviderEditor, {
            namespace: state.officialNamespace!,
            api,
            writable: state.writable,
            reload: load,
          })
        : null,
      state.rows
        .filter((row) => row.declared !== true)
        .map((row) => e(providers.ProviderEditor, editorProps(row))),
      state.rows.some((row) => row.declared === true)
        ? e(
            'h3',
            { className: 'dsh-ma-section-title' },
            core.tr('customProviders'),
          )
        : null,
      state.rows
        .filter((row) => row.declared === true)
        .map((row) => e(providers.ProviderEditor, editorProps(row))),
    ),
    state.status === 'ready' && state.rows.length === 0
      ? e('p', { className: 'dsh-ma-status' }, core.tr('empty'))
      : null,
  )
}
export function LocalePage({ locale, ...props }: LocalePageProps) {
  const [, setRevision] = React.useState(0)
  React.useEffect(
    () => locale.subscribe(() => setRevision((value) => value + 1)),
    [locale],
  )
  core.setTranslator(locale.bind(NS))
  return e(AdvancedModelsPage, props)
}
