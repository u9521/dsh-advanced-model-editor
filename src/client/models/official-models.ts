import * as React from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import { CapacityInput, Modalities, TextInput } from '../controls/index.ts'
import type { Modality, ModelProfile } from '../types.ts'
import { clone, tr } from '../utils.ts'

export interface OfficialModelListProps {
  value?: ModelProfile[]
  onChange: (value: ModelProfile[]) => void
  disabled?: boolean
}

const e = React.createElement

function setField<T extends object>(
  source: T | undefined,
  field: string,
  value: unknown,
): T {
  const next = clone({ ...(source || {}) }) as Record<string, unknown>
  delete next.imageDetail
  if (value === undefined) delete next[field]
  else next[field] = clone(value)
  return next as T
}

export function OfficialModelList({
  value,
  onChange,
  disabled,
}: OfficialModelListProps) {
  const models = Array.isArray(value) ? value : []
  const update = (
    index: number,
    field: string,
    value: string | number | undefined,
  ) =>
    onChange(
      models.map((model, modelIndex) =>
        modelIndex === index
          ? setField(model, field, value === '' ? undefined : value)
          : model,
      ),
    )
  return e(
    'div',
    { className: 'dsh-ma-wide' },
    models.map((model, index) => {
      const modalities = model.inputModalities ?? model.input ?? ['text']
      const hasImage = modalities.includes('image')
      return e(
        'div',
        {
          className: 'dsh-ma-model',
          key: `${model.id || 'model'}-${index}`,
        },
        e(
          'div',
          { className: 'dsh-ma-model-head' },
          e(
            'span',
            { className: 'dsh-ma-model-title' },
            model.id || tr('models.item.fallback', { index: index + 1 }),
          ),
          e(
            'div',
            { className: 'dsh-ma-toolbar' },
            e(
              'button',
              {
                type: 'button',
                className: 'dsh-ma-button dsh-ma-icon',
                disabled,
                title: tr('models.action.clone'),
                'aria-label': tr('models.action.clone'),
                onClick: () => {
                  const cloned = clone(model)
                  if (cloned.id) {
                    const existingIds = new Set(
                      models
                        .map((m) => m.id)
                        .filter((id): id is string => Boolean(id)),
                    )
                    let copyId = `${cloned.id}-copy`
                    let counter = 2
                    while (existingIds.has(copyId)) {
                      copyId = `${cloned.id}-copy-${counter}`
                      counter += 1
                    }
                    cloned.id = copyId
                  }
                  const nextModels = [
                    ...models.slice(0, index + 1),
                    cloned,
                    ...models.slice(index + 1),
                  ]
                  onChange(nextModels)
                },
              },
              e(primitives.IconCopyOutline16, { size: 16 }),
            ),
            e(
              'button',
              {
                type: 'button',
                className: 'dsh-ma-button dsh-ma-icon',
                disabled,
                title: tr('models.action.remove'),
                'aria-label': tr('models.action.remove'),
                onClick: () =>
                  onChange(
                    models.filter((_, modelIndex) => modelIndex !== index),
                  ),
              },
              e(primitives.IconCloseOutline16, { size: 16 }),
            ),
          ),
        ),
        e(
          'div',
          { className: 'dsh-ma-grid' },
          e(
            'label',
            { className: 'dsh-ma-field' },
            e(
              'span',
              { className: 'dsh-ma-field-label' },
              tr('models.field.id'),
            ),
            e(TextInput, {
              value: model.id,
              disabled,
              onChange: (nextValue) => update(index, 'id', nextValue),
            }),
          ),
          e(
            'label',
            { className: 'dsh-ma-field' },
            e(
              'span',
              { className: 'dsh-ma-field-label' },
              tr('models.field.name'),
            ),
            e(TextInput, {
              value: model.name,
              disabled,
              onChange: (nextValue) => update(index, 'name', nextValue),
            }),
          ),
          e(
            'label',
            { className: 'dsh-ma-field dsh-ma-wide' },
            e(
              'span',
              { className: 'dsh-ma-field-label' },
              tr('models.field.description'),
            ),
            e(TextInput, {
              value: model.description,
              disabled,
              onChange: (nextValue) => update(index, 'description', nextValue),
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
              placeholder: '256K',
              ariaLabelKey: 'models.field.contextWindow',
              onChange: (nextValue) =>
                update(index, 'contextWindow', nextValue),
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
              placeholder: '32K',
              ariaLabelKey: 'models.field.maxTokens',
              onChange: (nextValue) => update(index, 'maxTokens', nextValue),
            }),
          ),
          e(
            'div',
            { className: 'dsh-ma-field dsh-ma-wide' },
            e(
              'span',
              { className: 'dsh-ma-field-label' },
              tr('models.field.inputModalities'),
            ),
            e(Modalities, {
              value: modalities,
              disabled,
              onChange: (nextValue) => {
                const nextModalities =
                  nextValue.length === 0 ? ['text'] : nextValue
                const nextHasImage = nextModalities.includes('image')
                const nextModel = {
                  ...model,
                  inputModalities: nextModalities as Modality[],
                }
                if (!nextHasImage) {
                  delete nextModel.imagePixelBudget
                  delete nextModel.imageMaxBytes
                }
                delete (nextModel as Record<string, unknown>).imageDetail
                delete nextModel.input
                onChange(
                  models.map((item, itemIndex) =>
                    itemIndex === index ? nextModel : item,
                  ),
                )
              },
            }),
          ),
          hasImage
            ? e(
                'label',
                { className: 'dsh-ma-field' },
                e(
                  'span',
                  { className: 'dsh-ma-field-label' },
                  tr('models.field.imagePixelBudget'),
                ),
                e(CapacityInput, {
                  value: model.imagePixelBudget,
                  allowLow: true,
                  disabled,
                  placeholderKey: 'placeholder.imagePixelBudget',
                  ariaLabelKey: 'models.field.imagePixelBudget',
                  onChange: (nextValue) =>
                    update(index, 'imagePixelBudget', nextValue),
                }),
              )
            : null,
          hasImage
            ? e(
                'label',
                { className: 'dsh-ma-field' },
                e(
                  'span',
                  { className: 'dsh-ma-field-label' },
                  tr('models.field.imageMaxBytes'),
                ),
                e(CapacityInput, {
                  value: model.imageMaxBytes,
                  disabled,
                  placeholderKey: 'placeholder.imageMaxBytes',
                  ariaLabelKey: 'models.field.imageMaxBytes',
                  onChange: (nextValue) =>
                    update(index, 'imageMaxBytes', nextValue),
                }),
              )
            : null,
        ),
      )
    }),
    e(
      'button',
      {
        type: 'button',
        className: 'dsh-ma-button',
        disabled,
        onClick: () => onChange([...models, { id: '' }]),
      },
      e(primitives.IconPlusOutline16, { size: 14 }),
      tr('models.action.add'),
    ),
  )
}
