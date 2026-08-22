import * as React from 'react'
import { SETTINGS_NS } from '../constants.ts'
import { Field, ProtocolSelect, TextInput } from '../controls/index.ts'
import { ModelList } from '../models/index.ts'
import { stripModelCompat } from '../state.ts'
import type {
  ModelApi,
  ModelProfile,
  Protocol,
  ProviderProfile,
  ProviderRow,
  SettingsNamespaceView,
} from '../types.ts'
import { responseMessage, tr, valueOf } from '../utils.ts'
import { validateProfile } from '../validation.ts'

export interface CreateCustomProviderProps {
  namespace: SettingsNamespaceView
  rows: ProviderRow[]
  api: ModelApi
  writable: boolean
  reload: () => unknown
  close: () => void
}

const e = React.createElement

export function CreateCustomProvider({
  namespace,
  rows,
  api,
  writable,
  reload,
  close,
}: CreateCustomProviderProps) {
  const [route, setRoute] = React.useState('')
  const [displayName, setDisplayName] = React.useState('')
  const [protocol, setProtocol] = React.useState('openai-completions')
  const [baseURL, setBaseURL] = React.useState('')
  const [catalog, setCatalog] = React.useState<ModelProfile[]>([{ id: '' }])
  const [failure, setFailure] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const submit = async () => {
    const profile: ProviderProfile = stripModelCompat(
      {
        api: protocol as Protocol,
        baseURL,
        models: catalog,
      },
      protocol,
    )
    if (displayName.trim()) profile.displayName = displayName.trim()
    const errors = [
      ...(/^[a-z][a-z0-9-]*$/.test(route) ? [] : [tr('validation.route')]),
      ...(rows.some((row) => row.provider === route)
        ? [tr('validation.duplicateProvider')]
        : []),
      ...validateProfile(profile),
    ]
    if (errors.length) {
      setFailure(errors[0])
      return
    }
    setBusy(true)
    try {
      valueOf(
        await api.settings.mutate({
          ns: SETTINGS_NS,
          expectedRevision: namespace.revision,
          ops: [
            {
              op: 'set',
              path: ['providers', route],
              value: profile,
            },
          ],
        }),
      )
      await reload()
      close()
    } catch (error) {
      setFailure(responseMessage(error))
    } finally {
      setBusy(false)
    }
  }
  const disabled = !writable || busy
  return e(
    'section',
    { className: 'dsh-ma-create' },
    e('h3', { className: 'dsh-ma-group-title' }, tr('custom.title')),
    e(
      'div',
      { className: 'dsh-ma-grid' },
      e(
        Field,
        { labelKey: 'field.routeId' },
        e(TextInput, {
          value: route,
          disabled,
          placeholderKey: 'placeholder.providerId',
          onChange: (value) => setRoute(String(value || '')),
        }),
      ),
      e(
        Field,
        { labelKey: 'field.displayName' },
        e(TextInput, {
          value: displayName,
          disabled,
          placeholderKey: 'placeholder.displayName',
          onChange: (value) => setDisplayName(String(value || '')),
        }),
      ),
      e(
        Field,
        { labelKey: 'field.api' },
        e(ProtocolSelect, {
          value: protocol,
          disabled,
          onChange: (value) => setProtocol(value || 'openai-completions'),
        }),
      ),
      e(
        Field,
        { labelKey: 'field.baseURL', wide: true },
        e(TextInput, {
          value: baseURL,
          disabled,
          placeholderKey: 'placeholder.baseURL',
          onChange: (value) => setBaseURL(String(value || '')),
        }),
      ),
    ),
    e(
      Field,
      { labelKey: 'field.models', wide: true },
      e(ModelList, {
        value: catalog,
        disabled,
        api: protocol,
        onChange: (value) => setCatalog(Array.isArray(value) ? value : []),
      }),
    ),

    failure
      ? e(
          'p',
          { className: 'dsh-ma-status dsh-ma-error', role: 'alert' },
          failure,
        )
      : null,
    e(
      'div',
      { className: 'dsh-ma-actions' },
      e(
        'button',
        {
          type: 'button',
          className: 'dsh-ma-button',
          disabled: busy,
          onClick: close,
        },
        tr('action.cancel'),
      ),
      e(
        'button',
        {
          type: 'button',
          className: 'dsh-ma-button dsh-ma-primary',
          disabled,
          onClick: submit,
        },
        tr(busy ? 'action.creating' : 'action.createProvider'),
      ),
    ),
  )
}
