import * as React from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import { LOCALE_NS, OFFICIAL_NS, SETTINGS_NS } from './constants.ts'
import {
  AddBuiltInProvider,
  CreateCustomProvider,
  OfficialProviderEditor,
  ProviderEditor,
} from './providers/index.ts'
import type { SettingsDescribeFace, SettingsServices } from './settings.ts'
import { ensureDescribe, namespaceView } from './settings.ts'
import { hasUserProfile } from './state.ts'
import type {
  CredentialInfo,
  ModelApi,
  ProviderRow,
  SettingsNamespaceView,
  Translator,
} from './types.ts'
import { setTranslator, tr } from './i18n.ts'
import { responseMessage, valueOf } from './utils.ts'

/** The namespaces this page edits; both are owned by LLM adapter plugins. */
export const SUPPORTED_NAMESPACES: readonly string[] = [
  SETTINGS_NS,
  OFFICIAL_NS,
]

export interface AdvancedModelsPageProps {
  api: ModelApi
  describe: SettingsDescribeFace
  configForms: SettingsServices['configForms']
}

export interface LocaleService {
  bind(namespace: string): Translator
  subscribe(callback: () => void): () => void
}

export interface LocalePageProps extends AdvancedModelsPageProps {
  locale: LocaleService
}

const e = React.createElement
const NS = LOCALE_NS

interface PageState {
  status: 'loading' | 'ready' | 'error'
  writable: boolean
  rows: ProviderRow[]
  catalogRows: ProviderRow[]
  namespace: SettingsNamespaceView | undefined
  officialNamespace: SettingsNamespaceView | undefined
  error: string
}

/** One configurable-provider directory row as the wire reports it. */
interface DirectoryEntry {
  provider: string
  displayName: string
  settingsNs: string
  settingsPath: string[]
  active?: boolean
  declared?: boolean
  defaultBaseURL?: string
  baseURLEnv?: string[]
  nativeAuth?: { env: string[]; oauth: boolean }
  error?: string
}

/**
 * Redacted credential state for every reference a keyless route may use. A
 * route that names no `apiKeyEnv` authenticates through its own environment or
 * OAuth, so the page asks about those references instead of pretending the
 * route is missing a key.
 * @param api - the page's credential face.
 * @param rows - catalog rows carrying `nativeAuth`.
 * @returns the per-reference state, or undefined when the read failed.
 */
async function nativeCredentialChecks(
  api: ModelApi,
  rows: ProviderRow[],
): Promise<Readonly<Record<string, CredentialInfo>> | undefined> {
  const refs = [
    ...new Set(
      rows.flatMap((row) => (row.nativeAuth ? [...row.nativeAuth.env] : [])),
    ),
  ]
  if (refs.length === 0) return {}
  try {
    return valueOf<Record<string, CredentialInfo>>(
      await api.credentials.describe(refs),
    )
  } catch {
    return undefined
  }
}

/**
 * Turn one directory row into the row the editor renders, keeping every DSH
 * 0.2.1 fact (inherited endpoint, endpoint environment, native authentication,
 * catalog diagnostic) instead of dropping the ones the old wire lacked.
 *
 * The row is data only: the write faces travel beside it as props, so a row can
 * be built in a test without constructing a client.
 * @param entry - one configurable-provider directory row.
 * @param userAdded - whether the user layer carries this row's profile.
 * @returns the row the editor renders.
 */
function toProviderRow(entry: DirectoryEntry, userAdded: boolean): ProviderRow {
  return {
    provider: entry.provider,
    displayName: entry.displayName,
    settingsNs: entry.settingsNs,
    settingsPath: [...entry.settingsPath],
    active: entry.active,
    declared: entry.declared,
    ...(entry.defaultBaseURL === undefined
      ? {}
      : { defaultBaseURL: entry.defaultBaseURL }),
    ...(entry.baseURLEnv === undefined ? {} : { baseURLEnv: entry.baseURLEnv }),
    ...(entry.nativeAuth === undefined
      ? {}
      : {
          nativeAuth: {
            env: [...entry.nativeAuth.env],
            oauth: entry.nativeAuth.oauth === true,
          },
        }),
    ...(entry.error === undefined ? {} : { error: entry.error }),
    userAdded,
  }
}

export function AdvancedModelsPage({
  api,
  describe,
  configForms,
}: AdvancedModelsPageProps) {
  const [state, setState] = React.useState<PageState>({
    status: 'loading',
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
    const snapshot = describe.getSnapshot()
    if (snapshot.view === undefined) {
      setState((current) => ({
        ...current,
        status: snapshot.error === null ? 'loading' : 'error',
        error: snapshot.error ?? '',
      }))
      return
    }
    setState((current) => ({ ...current, status: 'loading', error: '' }))
    try {
      const providerResponse = await api.llm.providers({})
      const providerList = valueOf<{ providers: DirectoryEntry[] }>(
        providerResponse,
      ).providers
      const namespace = namespaceView(describe, SETTINGS_NS)
      const officialNamespace = namespaceView(describe, OFFICIAL_NS)
      if (!namespace || !officialNamespace) {
        setState((current) => ({ ...current, status: 'loading', error: '' }))
        return
      }
      const llmRows = providerList
        .filter((entry) => entry.settingsNs === SETTINGS_NS)
        .map((entry) =>
          toProviderRow(entry, hasUserProfile(namespace, entry.settingsPath)),
        )
      const checks = await nativeCredentialChecks(api, llmRows)
      const catalogRows = llmRows.map((row) =>
        checks === undefined ? row : { ...row, credentialChecks: checks },
      )
      setState({
        status: 'ready',
        writable: describe.getSnapshot().view?.writable === true,
        rows: catalogRows.filter((entry) => entry.userAdded),
        catalogRows,
        namespace,
        officialNamespace,
        error: '',
      })
    } catch (error) {
      setState((current) => ({
        ...current,
        status: 'error',
        error: responseMessage(error),
      }))
    }
  }
  React.useEffect(() => {
    ensureDescribe(describe)
    void load()
    return describe.subscribe(() => {
      void load()
    })
  }, [describe])
  const editorProps = (row: ProviderRow) => ({
    key: row.provider,
    row,
    api,
    namespace: state.namespace!,
    writable: state.writable,
    form: configForms.get(SETTINGS_NS),
    reload: load,
  })
  return e(
    'div',
    { className: 'dsh-ma-page' },
    e(
      'div',
      { className: 'dsh-ma-header' },
      e('h2', { className: 'dsh-ma-title' }, tr('title')),
      e(
        'div',
        { className: 'dsh-ma-toolbar' },
        e(
          'button',
          {
            type: 'button',
            className: 'dsh-ma-button',
            disabled: state.status === 'loading',
            title: tr('refresh'),
            'aria-label': tr('refresh'),
            onClick: load,
          },
          e(primitives.IconRefreshOutlineRegular, { size: 16 }),
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
          e(primitives.IconPlusOutlineRegular, { size: 14 }),
          tr('addBuiltIn'),
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
          e(primitives.IconPlusOutlineRegular, { size: 14 }),
          tr('addCustom'),
        ),
      ),
    ),
    !state.writable && state.status === 'ready'
      ? e('div', { className: 'dsh-ma-notice' }, tr('readOnly'))
      : null,
    state.status === 'loading'
      ? e('p', { className: 'dsh-ma-status' }, tr('loading'))
      : null,
    state.status === 'error'
      ? e(
          'p',
          { className: 'dsh-ma-status dsh-ma-error', role: 'alert' },
          state.error,
        )
      : null,
    createMode === 'builtin' && state.namespace
      ? e(AddBuiltInProvider, {
          rows: state.catalogRows,
          form: configForms.get(SETTINGS_NS),
          writable: state.writable,
          reload: load,
          close: () => setCreateMode(undefined),
        })
      : null,
    createMode === 'custom' && state.namespace
      ? e(CreateCustomProvider, {
          rows: state.catalogRows,
          form: configForms.get(SETTINGS_NS),
          writable: state.writable,
          reload: load,
          close: () => setCreateMode(undefined),
        })
      : null,
    e(
      'div',
      { className: 'dsh-ma-list' },
      e('h3', { className: 'dsh-ma-section-title' }, tr('builtInProviders')),
      state.officialNamespace
        ? e(OfficialProviderEditor, {
            namespace: state.officialNamespace!,
            api,
            form: configForms.get(OFFICIAL_NS),
            writable: state.writable,
            reload: load,
          })
        : null,
      state.rows
        .filter((row) => row.declared !== true)
        .map((row) => e(ProviderEditor, editorProps(row))),
      state.rows.some((row) => row.declared === true)
        ? e('h3', { className: 'dsh-ma-section-title' }, tr('customProviders'))
        : null,
      state.rows
        .filter((row) => row.declared === true)
        .map((row) => e(ProviderEditor, editorProps(row))),
    ),
    state.status === 'ready' && state.rows.length === 0
      ? e('p', { className: 'dsh-ma-status' }, tr('empty'))
      : null,
  )
}

export function LocalePage({ locale, ...props }: LocalePageProps) {
  const [, setRevision] = React.useState(0)
  React.useEffect(
    () => locale.subscribe(() => setRevision((value) => value + 1)),
    [locale],
  )
  setTranslator(locale.bind(NS))
  return e(AdvancedModelsPage, props)
}
