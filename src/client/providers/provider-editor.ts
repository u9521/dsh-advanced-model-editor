import * as React from 'react'
import {
  CACHE_RETENTIONS,
  PROFILE_FIELDS,
  SETTINGS_NS,
  THINKING_LEVELS,
  TRANSPORTS,
} from '../constants.ts'
import {
  CapacityInput,
  CompatEditor,
  Field,
  KeyValueList,
  Modalities,
  ProtocolSelect,
  RetryPolicy,
  Select,
  TextInput,
} from '../controls/index.ts'
import { ModelList } from '../models/index.ts'
import { BUDGET_LEVELS } from '../constants.ts'
import type {
  BudgetLevel,
  ProviderRow,
  SettingsNamespaceView,
} from '../types.ts'
import {
  buildProfileOps,
  initialEditorState,
  stripModelCompat,
} from '../state.ts'
import {
  clone,
  deriveKeyRef,
  isObject,
  responseMessage,
  setIn,
  tr,
  valueOf,
} from '../utils.ts'
import { validateProfile } from '../validation.ts'
import { CredentialField } from './credential-field.ts'

export interface ProviderEditorProps {
  row: ProviderRow
  namespace: SettingsNamespaceView
  writable: boolean
  reload: () => unknown
  timeout: (callback: () => void, delay: number) => () => void
}

const e = React.createElement

function translatedChoices(values: readonly string[], prefix: string) {
  return values.map((value) => ({ value, labelKey: `${prefix}.${value}` }))
}

export function ProviderEditor({
  row,
  namespace,
  writable,
  reload,
  timeout,
}: ProviderEditorProps) {
  const initial = initialEditorState(namespace, row.settingsPath)
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState(initial.profile)
  const [explicit, setExplicit] = React.useState(initial.explicit)
  const [baseline, setBaseline] = React.useState(initial)
  const [failure, setFailure] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const [deleteCountdown, setDeleteCountdown] = React.useState(0)
  const [keyDraft, setKeyDraft] = React.useState('')

  React.useEffect(() => {
    const next = initialEditorState(namespace, row.settingsPath)
    setDraft(next.profile)
    setExplicit(next.explicit)
    setBaseline(next)
    setFailure('')
  }, [namespace.revision, row.provider])

  React.useEffect(() => {
    if (!confirmDelete || deleteCountdown <= 0) return undefined
    return timeout(() => setDeleteCountdown((value) => value - 1), 1000)
  }, [confirmDelete, deleteCountdown, timeout])

  const readOnly = !writable || busy
  const keyRef =
    typeof draft.apiKeyEnv === 'string' && draft.apiKeyEnv
      ? draft.apiKeyEnv
      : deriveKeyRef(row.provider)
  const keyValue = keyDraft.trim()
  const setField = (field: string, value: unknown) => {
    setDraft((current) => setIn(current, field, value))
    setExplicit((current) => ({ ...current, [field]: true }))
  }
  const field = (name: string, child: React.ReactNode, wide?: boolean) =>
    e(
      Field,
      {
        key: name,
        labelKey: `field.${name}`,
        enabled: explicit[name] === true,
        readOnly,
        wide,
        onEnabled: (enabled) =>
          setExplicit((current) => ({ ...current, [name]: enabled })),
      },
      child,
    )

  const cleaned = stripModelCompat(draft, draft.api)
  const ops = buildProfileOps(row.settingsPath, baseline, cleaned, explicit)
  if (keyValue && !explicit.apiKeyEnv) {
    ops.push({
      op: 'set',
      path: [...row.settingsPath, 'apiKeyEnv'],
      value: keyRef,
    })
  }

  const save = async () => {
    const profile = Object.fromEntries(
      PROFILE_FIELDS.filter(
        (name) =>
          (name === 'api' && (row.declared || explicit.api || draft.api)) ||
          explicit[name] ||
          (name === 'apiKeyEnv' && keyValue),
      ).map((name) => [
        name,
        name === 'apiKeyEnv' && !explicit.apiKeyEnv ? keyRef : cleaned[name],
      ]),
    )
    const errors = validateProfile(profile)
    if (errors.length) {
      setFailure(errors[0])
      return
    }
    setBusy(true)
    setFailure('')
    try {
      if (ops.length)
        valueOf(
          await row.api.settings.mutate({
            ns: SETTINGS_NS,
            ops,
            expectedRevision: namespace.revision,
          }),
        )
      if (keyValue)
        valueOf(
          await row.api.credentials.set({
            ref: keyRef,
            value: keyValue,
          }),
        )
      setKeyDraft('')
      await reload()
    } catch (error) {
      setFailure(responseMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (deleteCountdown > 0) return
    setBusy(true)
    setFailure('')
    try {
      if (typeof draft.apiKeyEnv === 'string' && draft.apiKeyEnv) {
        valueOf(await row.api.credentials.unset({ ref: draft.apiKeyEnv }))
      }
      valueOf(
        await row.api.settings.mutate({
          ns: SETTINGS_NS,
          ops: [{ op: 'unset', path: [...row.settingsPath] }],
          expectedRevision: namespace.revision,
        }),
      )
      await reload()
    } catch (error) {
      setFailure(responseMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const customFields = e(
    React.Fragment,
    null,
    e(
      'div',
      { className: 'dsh-ma-group' },
      e('h3', { className: 'dsh-ma-group-title' }, tr('group.connection')),
      e(
        'div',
        { className: 'dsh-ma-grid' },
        field(
          'displayName',
          e(TextInput, {
            value: draft.displayName,
            disabled: !explicit.displayName || readOnly,
            onChange: (value) => setField('displayName', value),
          }),
        ),
        field(
          'apiKeyEnv',
          e(TextInput, {
            value: draft.apiKeyEnv,
            disabled: !explicit.apiKeyEnv || readOnly,
            placeholderKey: 'placeholder.credentialRef',
            onChange: (value) => setField('apiKeyEnv', value),
          }),
        ),
        e(CredentialField, {
          api: row.api,
          keyRef,
          revision: namespace.revision,
          value: keyDraft,
          disabled: readOnly,
          onChange: (value) => setKeyDraft(String(value || '')),
        }),
        e(
          Field,
          {
            key: 'api',
            labelKey: 'field.api',
            readOnly,
          },
          e(ProtocolSelect, {
            value: draft.api || 'openai-completions',
            disabled: readOnly,
            onChange: (value) => setField('api', value),
          }),
        ),
        field(
          'baseURL',
          e(TextInput, {
            value: draft.baseURL,
            disabled: !explicit.baseURL || readOnly,
            placeholderKey: 'placeholder.baseURL',
            onChange: (value) => setField('baseURL', value),
          }),
          true,
        ),
      ),
    ),
    e(
      'div',
      { className: 'dsh-ma-group' },
      e('h3', { className: 'dsh-ma-group-title' }, tr('group.capacity')),
      e(
        'div',
        { className: 'dsh-ma-grid dsh-ma-grid-3' },
        field(
          'defaultContextWindow',
          e(CapacityInput, {
            value: draft.defaultContextWindow,
            disabled: !explicit.defaultContextWindow || readOnly,
            placeholderKey: 'placeholder.defaultContextWindow',
            ariaLabelKey: 'field.defaultContextWindow',
            onChange: (value) => setField('defaultContextWindow', value),
          }),
        ),
        field(
          'defaultMaxTokens',
          e(CapacityInput, {
            value: draft.defaultMaxTokens,
            disabled: !explicit.defaultMaxTokens || readOnly,
            placeholderKey: 'placeholder.defaultMaxTokens',
            ariaLabelKey: 'field.defaultMaxTokens',
            onChange: (value) => setField('defaultMaxTokens', value),
          }),
        ),
        field(
          'defaultInput',
          e(Modalities, {
            value: draft.defaultInput,
            disabled: !explicit.defaultInput || readOnly,
            onChange: (value) => setField('defaultInput', value),
          }),
        ),
        field(
          'maxRequestImageBytes',
          e(CapacityInput, {
            value: draft.maxRequestImageBytes,
            disabled: !explicit.maxRequestImageBytes || readOnly,
            placeholderKey: 'placeholder.maxRequestImageBytes',
            ariaLabelKey: 'field.maxRequestImageBytes',
            onChange: (value) => setField('maxRequestImageBytes', value),
          }),
        ),
        field(
          'requestImagePixelBudget',
          e(CapacityInput, {
            value: draft.requestImagePixelBudget,
            disabled: !explicit.requestImagePixelBudget || readOnly,
            placeholderKey: 'placeholder.requestImagePixelBudget',
            ariaLabelKey: 'field.requestImagePixelBudget',
            onChange: (value) => setField('requestImagePixelBudget', value),
          }),
        ),
        field(
          'requestImageMaxBytes',
          e(CapacityInput, {
            value: draft.requestImageMaxBytes,
            disabled: !explicit.requestImageMaxBytes || readOnly,
            placeholderKey: 'placeholder.requestImageMaxBytes',
            ariaLabelKey: 'field.requestImageMaxBytes',
            onChange: (value) => setField('requestImageMaxBytes', value),
          }),
        ),
      ),
    ),
    e(
      'div',
      { className: 'dsh-ma-group' },
      e('h3', { className: 'dsh-ma-group-title' }, tr('group.reasoning')),
      e(
        'div',
        { className: 'dsh-ma-grid' },
        field(
          'reasoning',
          e(Select, {
            value: draft.reasoning,
            choices: translatedChoices(THINKING_LEVELS, 'option.thinking'),
            disabled: !explicit.reasoning || readOnly,
            onChange: (value) => setField('reasoning', value),
          }),
        ),
        field(
          'cacheRetention',
          e(Select, {
            value: draft.cacheRetention,
            choices: translatedChoices(CACHE_RETENTIONS, 'option.cache'),
            disabled: !explicit.cacheRetention || readOnly,
            onChange: (value) => setField('cacheRetention', value),
          }),
        ),
        field(
          'thinkingBudgets',
          e(
            'div',
            { className: 'dsh-ma-subgrid' },
            BUDGET_LEVELS.map((level) =>
              e(
                'label',
                { className: 'dsh-ma-field', key: level },
                e(
                  'span',
                  { className: 'dsh-ma-field-label' },
                  tr(`option.thinking.${level}`),
                ),
                e(TextInput, {
                  type: 'number',
                  min: 0,
                  step: 1,
                  value: isObject(draft.thinkingBudgets)
                    ? (draft.thinkingBudgets as Record<BudgetLevel, number>)[
                        level
                      ]
                    : undefined,
                  disabled: !explicit.thinkingBudgets || readOnly,
                  onChange: (value) => {
                    const next = {
                      ...(isObject(draft.thinkingBudgets)
                        ? draft.thinkingBudgets
                        : {}),
                    }
                    if (value === undefined) delete next[level]
                    else next[level] = value as number
                    setField('thinkingBudgets', next)
                  },
                }),
              ),
            ),
          ),
          true,
        ),
        field(
          'compat',
          e(CompatEditor, {
            value: draft.compat,
            api: draft.api,
            titleKey: 'field.compat',
            disabled: !explicit.compat || readOnly,
            onChange: (value) => setField('compat', value),
          }),
          true,
        ),
      ),
    ),
    e(
      'div',
      { className: 'dsh-ma-group' },
      e('h3', { className: 'dsh-ma-group-title' }, tr('group.transport')),
      e(
        'div',
        { className: 'dsh-ma-grid dsh-ma-grid-3' },
        field(
          'transport',
          e(Select, {
            value: draft.transport,
            choices: translatedChoices(TRANSPORTS, 'option.transport'),
            disabled: !explicit.transport || readOnly,
            onChange: (value) => setField('transport', value),
          }),
        ),
        ...[
          'timeoutMs',
          'websocketConnectTimeoutMs',
          'streamIdleTimeoutMs',
        ].map((name) =>
          field(
            name,
            e(TextInput, {
              type: 'number',
              min: name === 'streamIdleTimeoutMs' ? 1 : 0,
              value: draft[name] as string | number | undefined,
              disabled: !explicit[name] || readOnly,
              onChange: (value) => setField(name, value),
            }),
          ),
        ),
      ),
    ),
    e(
      'div',
      { className: 'dsh-ma-group' },
      field(
        'headers',
        e(KeyValueList, {
          kind: 'headers',
          value: draft.headers,
          disabled: !explicit.headers || readOnly,
          onChange: (value) => setField('headers', value),
        }),
        true,
      ),
    ),
    e(
      'div',
      { className: 'dsh-ma-group' },
      field(
        'retryPolicy',
        e(RetryPolicy, {
          value: draft.retryPolicy,
          disabled: !explicit.retryPolicy || readOnly,
          onChange: (value) => setField('retryPolicy', value),
        }),
        true,
      ),
    ),
    e(
      'div',
      { className: 'dsh-ma-group' },
      field(
        'models',
        e(ModelList, {
          value: draft.models,
          disabled: !explicit.models || readOnly,
          api: draft.api,
          probe: {
            clientApi: row.api,
            provider: row.provider,
            baseURL: draft.baseURL,
            api: draft.api,
            apiKey: keyValue || undefined,
          },
          onChange: (value) => setField('models', value),
        }),
        true,
      ),
    ),
  )

  const builtInFields = e(
    'div',
    { className: 'dsh-ma-group' },
    e('h3', { className: 'dsh-ma-group-title' }, tr('group.overrides')),
    explicit.models && explicit.modelOverrides
      ? e(
          'div',
          { className: 'dsh-ma-notice' },
          tr('validation.catalogConflict'),
        )
      : null,
    field(
      'modelOverrides',
      e(ModelList, {
        override: true,
        value: draft.modelOverrides,
        disabled: !explicit.modelOverrides || explicit.models || readOnly,
        api: draft.api,
        onChange: (value) => setField('modelOverrides', value),
      }),
      true,
    ),
  )

  return e(
    'section',
    { className: 'dsh-ma-provider' },
    e(
      'div',
      { className: 'dsh-ma-provider-head' },
      e(
        'div',
        { className: 'dsh-ma-identity' },
        e('span', { className: 'dsh-ma-name' }, row.displayName),
        e('span', { className: 'dsh-ma-route' }, row.provider),
        e(
          'span',
          { className: 'dsh-ma-tag' },
          tr(row.declared ? 'provider.custom' : 'provider.builtIn'),
        ),
      ),
      row.userAdded
        ? e(
            'button',
            {
              type: 'button',
              className: 'dsh-ma-button',
              disabled: readOnly,
              onClick: () => {
                setConfirmDelete(true)
                setDeleteCountdown(3)
              },
            },
            tr('action.delete'),
          )
        : null,
      e(
        'button',
        {
          type: 'button',
          className: 'dsh-ma-button',
          'aria-expanded': open,
          onClick: () => setOpen((value) => !value),
        },
        tr(open ? 'action.collapse' : 'action.edit'),
      ),
    ),
    confirmDelete
      ? e(
          'div',
          { className: 'dsh-ma-delete-confirm', role: 'alert' },
          e(
            'p',
            null,
            tr(
              draft.apiKeyEnv ? 'delete.withCredential' : 'delete.providerOnly',
              { ref: draft.apiKeyEnv || '' },
            ),
          ),
          e(
            'div',
            { className: 'dsh-ma-actions' },
            e(
              'button',
              {
                type: 'button',
                className: 'dsh-ma-button',
                disabled: busy,
                onClick: () => {
                  setConfirmDelete(false)
                  setDeleteCountdown(0)
                },
              },
              tr('action.cancel'),
            ),
            e(
              'button',
              {
                type: 'button',
                className: 'dsh-ma-button dsh-ma-primary',
                disabled: readOnly || deleteCountdown > 0,
                onClick: remove,
              },
              deleteCountdown > 0
                ? tr('delete.wait', {
                    seconds: deleteCountdown,
                  })
                : tr('action.confirmDelete'),
            ),
          ),
        )
      : null,
    open
      ? e(
          'div',
          { className: 'dsh-ma-form' },
          customFields,
          row.declared ? null : builtInFields,
          failure
            ? e(
                'p',
                {
                  className: 'dsh-ma-status dsh-ma-error',
                  role: 'alert',
                },
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
                disabled: readOnly || !ops.length,
                onClick: () => {
                  setDraft(clone(baseline.profile))
                  setExplicit({ ...baseline.explicit })
                  setFailure('')
                },
              },
              tr('action.undo'),
            ),
            e(
              'button',
              {
                type: 'button',
                className: 'dsh-ma-button dsh-ma-primary',
                disabled: readOnly || !ops.length,
                onClick: save,
              },
              tr(busy ? 'action.saving' : 'action.apply'),
            ),
          ),
        )
      : null,
  )
}
