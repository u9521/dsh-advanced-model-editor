import * as React from 'react'
import {
  MAX_TIMER_DELAY_MS,
  OFFICIAL_NS,
  OFFICIAL_REASONING,
  OFFICIAL_THINKING,
} from '../constants.ts'
import { commit, outcomeMessage } from '../commit.ts'
import { listingFollow, restoreDefaultOps } from '../listing.ts'
import { planReplace } from '../plan.ts'
import {
  CapacityInput,
  Field,
  RetryPolicy,
  Select,
  TextInput,
} from '../controls/index.ts'
import { ModelList } from '../models/index.ts'
import { OFFICIAL_MODEL_FIELDS } from '../models/model-fields.ts'
import type { ConfigForm } from '../settings.ts'
import type {
  ModelApi,
  OfficialProfile,
  SettingsNamespaceView,
} from '../types.ts'
import { tr } from '../i18n.ts'
import { clone, deriveKeyRef, setIn } from '../utils.ts'
import { validateOfficialProfile } from '../validation.ts'
import { CredentialField } from './credential-field.ts'

export interface OfficialProviderEditorProps {
  namespace: SettingsNamespaceView
  /** Schema default for `models` — the built-in catalog the adapter compares against. */
  builtInCatalog: unknown
  api: ModelApi
  form: ConfigForm
  writable: boolean
  reload: () => unknown
}

const e = React.createElement

function translatedChoices(values: readonly string[], prefix: string) {
  return values.map((value) => ({ value, labelKey: `${prefix}.${value}` }))
}

export function OfficialProviderEditor({
  namespace,
  builtInCatalog,
  api,
  form,
  writable,
  reload,
}: OfficialProviderEditorProps) {
  const initial = clone(namespace?.value || {}) as OfficialProfile
  const [draft, setDraft] = React.useState(initial)
  const [baseline, setBaseline] = React.useState(initial)
  const [keyDraft, setKeyDraft] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [failure, setFailure] = React.useState('')
  const [open, setOpen] = React.useState(false)
  React.useEffect(() => {
    const next = clone(namespace?.value || {}) as OfficialProfile
    setDraft(next)
    setBaseline(next)
    setFailure('')
  }, [namespace.revision])
  const keyRef = draft.apiKeyEnv || deriveKeyRef('deepseek')
  const setField = (field: string, value: unknown) =>
    setDraft((current) => setIn(current, field, value))
  // The official route has no override checkboxes: every field is the user's,
  // so presence in the draft is what decides. `planReplace` diffs the same way
  // the pi-ai editor's plan does, from one module rather than a second copy.
  const ops = planReplace([], baseline, draft)
  const keyValue = keyDraft.trim()
  if (keyValue && !draft.apiKeyEnv)
    ops.push({ op: 'set', path: ['apiKeyEnv'], value: keyRef })
  const save = async () => {
    const errors = validateOfficialProfile({
      ...draft,
      ...(keyValue && !draft.apiKeyEnv ? { apiKeyEnv: keyRef } : {}),
    })
    if (errors.length) {
      setFailure(errors[0])
      return
    }
    setBusy(true)
    setFailure('')
    const outcome = await commit({
      form,
      ops,
      api,
      ...(keyValue ? { credential: { ref: keyRef, value: keyValue } } : {}),
      reload,
    })
    if (outcome.kind === 'written') setKeyDraft('')
    const message = outcomeMessage(outcome)
    if (message !== undefined) setFailure(message)
    setBusy(false)
  }
  const readOnly = !writable || busy
  // The adapter follows `GET /models` only while `models` is still the built-in
  // catalog and the route is on the official origin. Editing the list is
  // therefore a behaviour change, not just a data edit, so the editor states
  // which side of it the user is on and offers the way back.
  const listing = listingFollow(namespace?.user, builtInCatalog)
  // Restoring goes through the same ordered commit the form uses — write the
  // batch, reload, report — rather than a second copy of that rule. It carries
  // no credential, and the write bumps the revision, so the draft resets to
  // the built-in catalog the Host now serves.
  const restore = async () => {
    setBusy(true)
    setFailure('')
    const outcome = await commit({
      form,
      ops: restoreDefaultOps([]),
      api,
      reload,
    })
    const message = outcomeMessage(outcome)
    if (message !== undefined) setFailure(message)
    setBusy(false)
  }
  return e(
    'section',
    { className: 'dsh-ma-provider', 'data-settings-ns': OFFICIAL_NS },
    e(
      'div',
      { className: 'dsh-ma-provider-head' },
      e(
        'div',
        { className: 'dsh-ma-identity' },
        e('span', { className: 'dsh-ma-name' }, tr('official.title')),
        e('span', { className: 'dsh-ma-route' }, OFFICIAL_NS),
        e('span', { className: 'dsh-ma-tag' }, tr('official.fixed')),
      ),
      e(
        'button',
        {
          type: 'button',
          className: 'dsh-ma-button',
          'aria-expanded': open,
          onClick: () => setOpen((value) => !value),
        },
        tr(open ? 'action.collapse' : 'action.expand'),
      ),
    ),
    open
      ? e(
          'div',
          { className: 'dsh-ma-form' },
          e(
            'div',
            { className: 'dsh-ma-group' },
            e(
              'h3',
              { className: 'dsh-ma-group-title' },
              tr('group.connection'),
            ),
            e(
              'div',
              { className: 'dsh-ma-grid' },
              e(CredentialField, {
                api,
                keyRef,
                revision: namespace.revision,
                value: keyDraft,
                disabled: readOnly,
                hasNamedRef:
                  typeof draft.apiKeyEnv === 'string' &&
                  draft.apiKeyEnv.length > 0,
                onChange: (value) => setKeyDraft(String(value || '')),
              }),
              e(
                Field,
                { labelKey: 'field.apiKeyEnv' },
                e(TextInput, {
                  value: draft.apiKeyEnv,
                  disabled: readOnly,
                  onChange: (value) => setField('apiKeyEnv', value),
                }),
              ),
              e(
                Field,
                { labelKey: 'field.baseURL', wide: true },
                e(TextInput, {
                  value: draft.baseURL,
                  disabled: readOnly,
                  placeholderKey: 'placeholder.officialBaseURL',
                  onChange: (value) => setField('baseURL', value),
                }),
              ),
            ),
          ),
          e(
            'div',
            { className: 'dsh-ma-group' },
            e(
              'h3',
              { className: 'dsh-ma-group-title' },
              tr('group.officialReasoning'),
            ),
            e(
              'div',
              { className: 'dsh-ma-grid' },
              e(
                Field,
                { labelKey: 'field.thinking' },
                e(Select, {
                  value: draft.thinking,
                  choices: translatedChoices(
                    OFFICIAL_THINKING,
                    'option.thinking',
                  ),
                  disabled: readOnly,
                  onChange: (value) => setField('thinking', value),
                }),
              ),
              e(
                Field,
                { labelKey: 'field.reasoningEffort' },
                e(Select, {
                  value: draft.reasoningEffort,
                  choices: translatedChoices(
                    OFFICIAL_REASONING,
                    'option.thinking',
                  ),
                  disabled: readOnly,
                  onChange: (value) => setField('reasoningEffort', value),
                }),
              ),
              e(
                Field,
                { labelKey: 'field.defaultContextWindow' },
                e(CapacityInput, {
                  value: draft.defaultContextWindow,
                  disabled: readOnly,
                  placeholderKey: 'placeholder.officialDefaultContextWindow',
                  ariaLabelKey: 'field.defaultContextWindow',
                  onChange: (value) => setField('defaultContextWindow', value),
                }),
              ),
              e(
                Field,
                { labelKey: 'field.maxTokens' },
                e(CapacityInput, {
                  value: draft.maxTokens,
                  disabled: readOnly,
                  placeholderKey: 'placeholder.officialMaxTokens',
                  ariaLabelKey: 'field.maxTokens',
                  onChange: (value) => setField('maxTokens', value),
                }),
              ),
            ),
          ),
          e(
            'div',
            { className: 'dsh-ma-group' },
            e('h3', { className: 'dsh-ma-group-title' }, tr('group.models')),
            e(
              'div',
              {
                className: `dsh-ma-listing dsh-ma-listing-${listing}`,
                role: 'status',
              },
              e(
                'span',
                { className: 'dsh-ma-listing-text' },
                tr(`listing.${listing}`),
              ),
              listing === 'customized'
                ? e(
                    'button',
                    {
                      type: 'button',
                      className: 'dsh-ma-button dsh-ma-button-quiet',
                      disabled: readOnly,
                      onClick: restore,
                    },
                    tr('listing.restore'),
                  )
                : null,
            ),
            e(ModelList, {
              value: draft.models,
              shape: 'array',
              fields: OFFICIAL_MODEL_FIELDS,
              disabled: readOnly,
              onChange: (value) =>
                setField('models', Array.isArray(value) ? value : []),
            }),
          ),
          e(
            'div',
            { className: 'dsh-ma-group' },
            e('h3', { className: 'dsh-ma-group-title' }, tr('group.vision')),
            e(
              'div',
              { className: 'dsh-ma-grid' },
              e(
                Field,
                { labelKey: 'field.maxRequestFilesBytes' },
                e(CapacityInput, {
                  value: draft.maxRequestFilesBytes,
                  disabled: readOnly,
                  placeholderKey: 'placeholder.maxRequestFilesBytes',
                  ariaLabelKey: 'field.maxRequestFilesBytes',
                  onChange: (value) => setField('maxRequestFilesBytes', value),
                }),
              ),
              e(
                Field,
                { labelKey: 'field.maxInlineRequestImageBytes' },
                e(CapacityInput, {
                  value: draft.maxInlineRequestImageBytes,
                  disabled: readOnly,
                  placeholderKey: 'placeholder.maxInlineRequestImageBytes',
                  ariaLabelKey: 'field.maxInlineRequestImageBytes',
                  onChange: (value) =>
                    setField('maxInlineRequestImageBytes', value),
                }),
              ),
              e(
                Field,
                { labelKey: 'field.maxImagesPerRequest' },
                e(TextInput, {
                  type: 'number',
                  min: 1,
                  step: 1,
                  value: draft.maxImagesPerRequest,
                  disabled: readOnly,
                  placeholderKey: 'placeholder.maxImagesPerRequest',
                  onChange: (value) => setField('maxImagesPerRequest', value),
                }),
              ),
              e(
                Field,
                { labelKey: 'field.filesApiTimeoutMs' },
                e(TextInput, {
                  type: 'number',
                  min: 1,
                  max: MAX_TIMER_DELAY_MS,
                  value: draft.filesApiTimeoutMs,
                  disabled: readOnly,
                  placeholderKey: 'placeholder.filesApiTimeoutMs',
                  onChange: (value) => setField('filesApiTimeoutMs', value),
                }),
              ),
              e(
                Field,
                { labelKey: 'field.imageOffloadByteQuantum' },
                e(CapacityInput, {
                  value: draft.imageOffloadByteQuantum,
                  disabled: readOnly,
                  placeholderKey: 'placeholder.imageOffloadByteQuantum',
                  ariaLabelKey: 'field.imageOffloadByteQuantum',
                  onChange: (value) =>
                    setField('imageOffloadByteQuantum', value),
                }),
              ),
              e(
                Field,
                { labelKey: 'field.inlineImageOffloadByteQuantum' },
                e(CapacityInput, {
                  value: draft.inlineImageOffloadByteQuantum,
                  disabled: readOnly,
                  placeholderKey: 'placeholder.inlineImageOffloadByteQuantum',
                  ariaLabelKey: 'field.inlineImageOffloadByteQuantum',
                  onChange: (value) =>
                    setField('inlineImageOffloadByteQuantum', value),
                }),
              ),
              e(
                Field,
                { labelKey: 'field.imageOffloadCountQuantum' },
                e(TextInput, {
                  type: 'number',
                  min: 1,
                  step: 1,
                  value: draft.imageOffloadCountQuantum,
                  disabled: readOnly,
                  placeholderKey: 'placeholder.imageOffloadCountQuantum',
                  onChange: (value) =>
                    setField('imageOffloadCountQuantum', value),
                }),
              ),
              e(
                Field,
                { labelKey: 'field.fileExpiresAfterSeconds' },
                e(TextInput, {
                  type: 'number',
                  min: 3600,
                  max: 2592000,
                  step: 1,
                  value: draft.fileExpiresAfterSeconds,
                  disabled: readOnly,
                  placeholderKey: 'placeholder.fileExpiresAfterSeconds',
                  onChange: (value) =>
                    setField('fileExpiresAfterSeconds', value),
                }),
              ),
              e(
                Field,
                { labelKey: 'field.fileRefreshMarginSeconds' },
                e(TextInput, {
                  type: 'number',
                  min: 0,
                  step: 1,
                  value: draft.fileRefreshMarginSeconds,
                  disabled: readOnly,
                  placeholderKey: 'placeholder.fileRefreshMarginSeconds',
                  onChange: (value) =>
                    setField('fileRefreshMarginSeconds', value),
                }),
              ),
              e(
                Field,
                { labelKey: 'field.fileQuotaCleanupBatch' },
                e(TextInput, {
                  type: 'number',
                  min: 1,
                  max: 1000,
                  step: 1,
                  value: draft.fileQuotaCleanupBatch,
                  disabled: readOnly,
                  placeholderKey: 'placeholder.fileQuotaCleanupBatch',
                  onChange: (value) => setField('fileQuotaCleanupBatch', value),
                }),
              ),
            ),
          ),
          e(
            'div',
            { className: 'dsh-ma-group' },
            e('h3', { className: 'dsh-ma-group-title' }, tr('group.flowRetry')),
            e(
              'div',
              { className: 'dsh-ma-grid' },
              e(
                Field,
                { labelKey: 'field.streamIdleTimeoutMs' },
                e(TextInput, {
                  type: 'number',
                  min: 1,
                  max: MAX_TIMER_DELAY_MS,
                  value: draft.streamIdleTimeoutMs,
                  disabled: readOnly,
                  onChange: (value) => setField('streamIdleTimeoutMs', value),
                }),
              ),
              // Listing timing joined the route's own settings: the deadline of
              // one `/models` request and the interval its answer is reused for.
              e(
                Field,
                { labelKey: 'field.modelsTimeoutMs' },
                e(TextInput, {
                  type: 'number',
                  min: 1,
                  max: MAX_TIMER_DELAY_MS,
                  value: draft.modelsTimeoutMs,
                  disabled: readOnly,
                  placeholderKey: 'placeholder.modelsTimeoutMs',
                  onChange: (value) => setField('modelsTimeoutMs', value),
                }),
              ),
              e(
                Field,
                { labelKey: 'field.modelsMaxAgeMs' },
                e(TextInput, {
                  type: 'number',
                  min: 0,
                  max: MAX_TIMER_DELAY_MS,
                  value: draft.modelsMaxAgeMs,
                  disabled: readOnly,
                  placeholderKey: 'placeholder.modelsMaxAgeMs',
                  onChange: (value) => setField('modelsMaxAgeMs', value),
                }),
              ),
              e(
                Field,
                { labelKey: 'field.retryPolicy', wide: true },
                e(RetryPolicy, {
                  value: draft.retryPolicy,
                  disabled: readOnly,
                  onChange: (value) => setField('retryPolicy', value),
                }),
              ),
            ),
          ),

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
                  setDraft(clone(baseline))
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
