import * as React from 'react'
import {
  CACHE_RETENTIONS,
  SETTINGS_NS,
  THINKING_LEVELS,
  TRANSPORTS,
} from '../constants.ts'
import { profileFieldChoices } from '../choices.ts'
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
import { PI_AI_MODEL_FIELDS } from '../models/model-fields.ts'
import { BUDGET_LEVELS } from '../constants.ts'
import { commit, outcomeMessage, removeProfile } from '../commit.ts'
import { planSave } from '../plan.ts'
import type { ConfigForm } from '../settings.ts'
import type {
  BudgetLevel,
  ModelApi,
  ProviderRow,
  SettingsNamespaceView,
} from '../types.ts'
import { initialEditorState } from '../state.ts'
import { tr } from '../i18n.ts'
import { clone, deriveKeyRef, isObject, setIn } from '../utils.ts'
import { validateProfile } from '../validation.ts'
import { CredentialField } from './credential-field.ts'

export interface ProviderEditorProps {
  row: ProviderRow
  /** Write faces for credentials and model discovery; the row carries data only. */
  api: ModelApi
  namespace: SettingsNamespaceView
  form: ConfigForm
  writable: boolean
  reload: () => unknown
}

const e = React.createElement

function translatedChoices(values: readonly string[], prefix: string) {
  return values.map((value) => ({ value, labelKey: `${prefix}.${value}` }))
}

/**
 * The endpoint this route uses when the profile sets no `baseURL`: the
 * adapter's fixed default, or the environment variables that build it. DSH
 * 0.2.1 added both facts to the configurable-provider directory, and showing
 * them stops an empty field from looking like a missing endpoint.
 * @param row - one directory row.
 * @returns the placeholder text, or undefined when the route declares neither.
 */
function inheritedEndpoint(row: ProviderRow): string | undefined {
  if (row.defaultBaseURL !== undefined) return row.defaultBaseURL
  if (row.baseURLEnv !== undefined && row.baseURLEnv.length > 0)
    return row.baseURLEnv.map((name) => `\${${name}}`).join(' / ')
  return undefined
}

export function ProviderEditor({
  row,
  api,
  namespace,
  form,
  writable,
  reload,
}: ProviderEditorProps) {
  const initial = initialEditorState(namespace, row.settingsPath)
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState(initial.profile)
  const [explicit, setExplicit] = React.useState(initial.explicit)
  const [baseline, setBaseline] = React.useState(initial)
  const [failure, setFailure] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [deleteConfirm, setDeleteConfirm] = React.useState(false)
  const [keyDraft, setKeyDraft] = React.useState('')

  React.useEffect(() => {
    const next = initialEditorState(namespace, row.settingsPath)
    setDraft(next.profile)
    setExplicit(next.explicit)
    setBaseline(next)
    setFailure('')
  }, [namespace.revision, row.provider])

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

  // One plan, computed once: the ops that will be written, the profile that
  // will be validated, and the credential step. They all come from `cleaned`,
  // which is what used to differ between the write and the validation.
  const plan = planSave({
    row,
    draft,
    baseline,
    explicit,
    keyValue,
    keyRef,
    chosen: profileFieldChoices(),
  })

  const save = async () => {
    const errors = validateProfile(plan.profile)
    if (errors.length) {
      setFailure(errors[0])
      return
    }
    setBusy(true)
    setFailure('')
    const outcome = await commit({
      form,
      ops: plan.ops,
      api,
      ...(plan.credential === undefined ? {} : { credential: plan.credential }),
      reload,
    })
    if (outcome.kind === 'written') setKeyDraft('')
    const message = outcomeMessage(outcome)
    if (message !== undefined) setFailure(message)
    setBusy(false)
  }

  const remove = async () => {
    setBusy(true)
    setFailure('')
    const outcome = await removeProfile({
      form,
      api,
      path: row.settingsPath,
      ...(typeof draft.apiKeyEnv === 'string' && draft.apiKeyEnv
        ? { credentialRef: draft.apiKeyEnv }
        : {}),
      reload,
    })
    const message = outcomeMessage(outcome)
    if (message !== undefined) setFailure(message)
    setBusy(false)
  }

  const customFields = e(
    React.Fragment,
    null,
    row.error
      ? e(
          'p',
          { className: 'dsh-ma-status dsh-ma-error', role: 'alert' },
          row.error,
        )
      : null,
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
          api,
          keyRef,
          revision: namespace.revision,
          value: keyDraft,
          disabled: readOnly,
          nativeAuth: row.nativeAuth,
          credentialChecks: row.credentialChecks,
          hasNamedRef:
            typeof draft.apiKeyEnv === 'string' && draft.apiKeyEnv.length > 0,
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
            placeholder: inheritedEndpoint(row),
            placeholderKey:
              row.defaultBaseURL === undefined &&
              (row.baseURLEnv === undefined || row.baseURLEnv.length === 0)
                ? 'placeholder.baseURL'
                : undefined,
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
          shape: 'array',
          fields: PI_AI_MODEL_FIELDS,
          disabled: !explicit.models || readOnly,
          api: draft.api,
          probe: {
            clientApi: api,
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
        shape: 'record',
        fields: PI_AI_MODEL_FIELDS,
        addKey: 'models.action.addOverride',
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
    { className: 'dsh-ma-provider', 'data-settings-ns': SETTINGS_NS },
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
              onClick: () => setDeleteConfirm(true),
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
    deleteConfirm
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
                onClick: () => setDeleteConfirm(false),
              },
              tr('action.cancel'),
            ),
            e(
              'button',
              {
                type: 'button',
                className: 'dsh-ma-button dsh-ma-primary',
                disabled: readOnly,
                onClick: remove,
              },
              tr('action.confirmDelete'),
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
                disabled: readOnly || !plan.ops.length,
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
                disabled: readOnly || !plan.ops.length,
                onClick: save,
              },
              tr(busy ? 'action.saving' : 'action.apply'),
            ),
          ),
        )
      : null,
  )
}
