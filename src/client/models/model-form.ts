import * as React from 'react'
import {
  CapacityInput,
  CompatEditor,
  Modalities,
  ReasoningEffortsEditor,
  TextInput,
} from '../controls/index.ts'
import type { ModelProfile } from '../types.ts'
import { clone, tr } from '../utils.ts'

export interface ModelFormProps {
  model: ModelProfile
  onChange: (model: ModelProfile) => void
  disabled?: boolean
  includeId?: boolean
  /** Wire protocol of the owning route; model compatibility only applies to supported protocols. */
  api?: string
}

const e = React.createElement

function setField<T extends object>(
  source: T | undefined,
  field: string,
  value: unknown,
): T {
  const next = clone({ ...(source || {}) }) as Record<string, unknown>
  if (value === undefined) delete next[field]
  else next[field] = clone(value)
  return next as T
}

export function ModelForm({
  model,
  onChange,
  disabled,
  includeId,
  api,
}: ModelFormProps) {
  const set = (field: string, value: unknown) =>
    onChange(setField(model, field, value))
  return e(
    'div',
    { className: 'dsh-ma-grid' },
    includeId
      ? e(
          'label',
          { className: 'dsh-ma-field' },
          e('span', { className: 'dsh-ma-field-label' }, tr('models.field.id')),
          e(TextInput, {
            value: model.id,
            disabled,
            onChange: (value) => set('id', value),
          }),
        )
      : null,
    e(
      'label',
      { className: 'dsh-ma-field' },
      e('span', { className: 'dsh-ma-field-label' }, tr('models.field.name')),
      e(TextInput, {
        value: model.name,
        disabled,
        onChange: (value) => set('name', value),
      }),
    ),
    e(
      'label',
      { className: 'dsh-ma-field' },
      e(
        'span',
        { className: 'dsh-ma-field-label' },
        tr('models.field.contextWindow'),
      ),
      e(CapacityInput, {
        value: model.contextWindow,
        disabled,
        placeholderKey: 'placeholder.contextWindow',
        ariaLabelKey: 'models.field.contextWindow',
        onChange: (value) => set('contextWindow', value),
      }),
    ),
    e(
      'label',
      { className: 'dsh-ma-field' },
      e(
        'span',
        { className: 'dsh-ma-field-label' },
        tr('models.field.maxTokens'),
      ),
      e(CapacityInput, {
        value: model.maxTokens,
        disabled,
        placeholderKey: 'placeholder.maxTokens',
        ariaLabelKey: 'models.field.maxTokens',
        onChange: (value) => set('maxTokens', value),
      }),
    ),
    e(
      'div',
      { className: 'dsh-ma-field' },
      e('span', { className: 'dsh-ma-field-label' }, tr('models.field.input')),
      e(Modalities, {
        value: model.input,
        disabled,
        onChange: (value) =>
          set('input', value.length === 0 ? undefined : value),
      }),
    ),
    e(
      'div',
      { className: 'dsh-ma-wide' },
      e(ReasoningEffortsEditor, {
        value: model.reasoningEfforts,
        disabled,
        titleKey: 'models.field.reasoningEfforts',
        onChange: (value) => set('reasoningEfforts', value),
      }),
    ),
    e(
      'div',
      { className: 'dsh-ma-wide' },
      e(CompatEditor, {
        value: model.compat,
        disabled,
        api,
        titleKey: 'models.field.compat',
        onChange: (value) => set('compat', value),
      }),
    ),
  )
}
