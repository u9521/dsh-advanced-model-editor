import * as React from 'react'
import {
  CapacityInput,
  CompatEditor,
  Modalities,
  ReasoningEffortsEditor,
  Select,
  TextInput,
} from '../controls/index.ts'
import { tr } from '../i18n.ts'
import type { Modality, ModelProfile } from '../types.ts'
import { clone } from '../utils.ts'

const e = React.createElement

/**
 * One per-model field descriptor.
 *
 * The two editors render different field sets on the same list mechanics, and
 * they disagree about the key that carries input modalities: a pi-ai route
 * stores `input` (its models are the route's own catalog), while the official
 * route stores `inputModalities` (its entries describe catalog models). That
 * naming difference is the reason two renderers existed; it is a data fact, so
 * it lives here as two adapters rather than as two list modules.
 */
export interface ModelField {
  /** Key on the model entry. */
  key: string
  /** Locale key for the label. */
  labelKey: string
  /** Control width hint. */
  wide?: boolean
  /**
   * Render the control.
   * @param model - the model entry being edited.
   * @param set - replace one field, deleting it when the value is undefined.
   * @param disabled - whether the whole list is read-only.
   * @param api - the owning route's wire protocol.
   * @returns the rendered field.
   */
  render: (
    model: ModelProfile,
    set: (field: string, value: unknown) => void,
    disabled: boolean | undefined,
    api: string | undefined,
  ) => React.ReactNode
}

/**
 * Read one entry loosely: the key comes from the field table, so the value is
 * only meaningful once a descriptor has named it.
 * @param model - the model entry.
 * @param key - the field key.
 * @returns the stored value, if any.
 */
function read(model: ModelProfile, key: string): unknown {
  return (model as Record<string, unknown>)[key]
}

const text = (key: string, labelKey: string, extra?: { wide?: boolean }) =>
  ({
    key,
    labelKey,
    ...(extra ?? {}),
    render: (
      model: ModelProfile,
      set: (field: string, value: unknown) => void,
      disabled?: boolean,
    ) =>
      e(TextInput, {
        value: read(model, key) as string | undefined,
        disabled,
        onChange: (value) => set(key, value),
      }),
  }) satisfies ModelField

const capacity = (key: string, placeholder: string) =>
  ({
    key,
    labelKey: `models.field.${key}`,
    render: (
      model: ModelProfile,
      set: (field: string, value: unknown) => void,
      disabled?: boolean,
    ) =>
      e(CapacityInput, {
        value: read(model, key) as number | undefined,
        disabled,
        placeholderKey: placeholder,
        ariaLabelKey: `models.field.${key}`,
        onChange: (value) => set(key, value),
      }),
  }) satisfies ModelField

const modalities = (key: string, toStored: (selected: Modality[]) => unknown) =>
  ({
    key,
    labelKey: `models.field.${key}`,
    render: (
      model: ModelProfile,
      set: (field: string, value: unknown) => void,
      disabled?: boolean,
    ) =>
      e(Modalities, {
        value: ((read(model, key) as Modality[] | undefined) ??
          []) as Modality[],
        disabled,
        onChange: (value: string[]) => set(key, toStored(value as Modality[])),
      }),
  }) satisfies ModelField

/** Fields a pi-ai route's own model list renders. */
export const PI_AI_MODEL_FIELDS: readonly ModelField[] = [
  text('id', 'models.field.id'),
  text('name', 'models.field.name'),
  capacity('contextWindow', 'placeholder.contextWindow'),
  capacity('maxTokens', 'placeholder.maxTokens'),
  modalities('input', (selected) =>
    selected.length === 0 ? undefined : selected,
  ),
  {
    key: 'reasoningEfforts',
    labelKey: 'models.field.reasoningEfforts',
    wide: true,
    render: (model, set, disabled) =>
      e(ReasoningEffortsEditor, {
        value: model.reasoningEfforts,
        disabled,
        titleKey: 'models.field.reasoningEfforts',
        onChange: (value) => set('reasoningEfforts', value),
      }),
  },
  {
    key: 'compat',
    labelKey: 'models.field.compat',
    wide: true,
    render: (model, set, disabled, api) =>
      e(CompatEditor, {
        value: model.compat,
        api,
        disabled,
        titleKey: 'models.field.compat',
        onChange: (value) => set('compat', value),
      }),
  },
]

/**
 * Fields the official route's model entry renders. The official catalog models
 * carry their own prompt/tool update semantics and image limits, and they spell
 * modalities as `inputModalities`.
 */
export const OFFICIAL_MODEL_FIELDS: readonly ModelField[] = [
  text('id', 'models.field.id'),
  text('name', 'models.field.name'),
  text('description', 'models.field.description', { wide: true }),
  capacity('contextWindow', 'placeholder.contextWindow'),
  capacity('maxTokens', 'placeholder.maxTokens'),
  {
    key: 'systemPromptUpdate',
    labelKey: 'models.field.systemPromptUpdate',
    wide: true,
    render: (model, set, disabled) =>
      e(Select, {
        value: model.systemPromptUpdate,
        choices: [
          {
            value: 'in-history',
            labelKey: 'models.systemPromptUpdate.inHistory',
          },
        ],
        disabled,
        unsetKey: 'models.systemPromptUpdate.default',
        onChange: (value) =>
          set(
            'systemPromptUpdate',
            value === 'in-history' ? 'in-history' : undefined,
          ),
      }),
  },
  {
    key: 'toolUpdate',
    labelKey: 'models.field.toolUpdate',
    wide: true,
    render: (model, set, disabled) =>
      e(Select, {
        value: model.toolUpdate,
        choices: [
          { value: 'in-history', labelKey: 'models.toolUpdate.inHistory' },
          {
            value: 'addition-only',
            labelKey: 'models.toolUpdate.additionOnly',
          },
        ],
        disabled,
        unsetKey: 'models.toolUpdate.default',
        onChange: (value) => set('toolUpdate', value),
      }),
  },
  modalities('inputModalities', (selected) =>
    selected.length === 0 ? ['text'] : selected,
  ),
  capacity('imagePixelBudget', 'placeholder.imagePixelBudget'),
  capacity('imageMaxBytes', 'placeholder.imageMaxBytes'),
]

/**
 * Render one model entry's fields.
 * @param props - the model, its field set, and the replace callback.
 * @returns the field grid.
 */
export function ModelFields({
  model,
  fields,
  api,
  disabled,
  onChange,
}: {
  model: ModelProfile
  fields: readonly ModelField[]
  api?: string
  disabled?: boolean
  onChange: (model: ModelProfile) => void
}) {
  const set = (field: string, value: unknown) => {
    const next: Record<string, unknown> = clone({ ...model })
    if (value === undefined) delete next[field]
    else next[field] = clone(value)
    // The official catalog's image limits only mean something while an image
    // modality survives on the entry, so clearing the modality clears them.
    if (field === 'inputModalities') {
      const selected = Array.isArray(value) ? (value as string[]) : []
      if (!selected.includes('image')) {
        delete next.imagePixelBudget
        delete next.imageMaxBytes
      }
    }
    onChange(next as ModelProfile)
  }
  return e(
    'div',
    { className: 'dsh-ma-grid' },
    fields.map((field) =>
      field.wide
        ? e(
            'div',
            { className: 'dsh-ma-wide', key: field.key },
            labeled(field, model, set, disabled, api),
          )
        : e(
            'label',
            { className: 'dsh-ma-field', key: field.key },
            e('span', { className: 'dsh-ma-field-label' }, tr(field.labelKey)),
            field.render(model, set, disabled, api),
          ),
    ),
  )
}

/**
 * Wrap a wide field in its own label, since a wide field's control can be a
 * composite that cannot sit inside a `label` element.
 * @param field - the field descriptor.
 * @param model - the model being edited.
 * @param set - replace one field.
 * @param disabled - whether the list is read-only.
 * @param api - the owning route's protocol.
 * @returns the labeled control.
 */
function labeled(
  field: ModelField,
  model: ModelProfile,
  set: (field: string, value: unknown) => void,
  disabled: boolean | undefined,
  api: string | undefined,
): React.ReactNode {
  return e(
    'div',
    { className: 'dsh-ma-field dsh-ma-wide' },
    field.key === 'reasoningEfforts' || field.key === 'compat'
      ? field.render(model, set, disabled, api)
      : e(
          React.Fragment,
          null,
          e('span', { className: 'dsh-ma-field-label' }, tr(field.labelKey)),
          field.render(model, set, disabled, api),
        ),
  )
}
