import * as React from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import { tr } from '../i18n.ts'
import { discoveredModelProfile } from '../state.ts'
import type { ModelProfile } from '../types.ts'
import { clone, isObject } from '../utils.ts'
import { DiscoveryProbe, ModelDiscoveryDialog } from './discovery-dialog.ts'
import type { ModelField } from './model-fields.ts'
import { ModelFields } from './model-fields.ts'

/**
 * How one list addresses its entries.
 *
 * A pi-ai route stores its models as an array in list order; a route that
 * overrides an installed catalog stores them as a record keyed by model id.
 * That is the one real difference between the two lists, so it is a parameter
 * rather than a second module.
 */
export type ModelListShape = 'array' | 'record'

export interface ModelListProps {
  /** The stored value: an array or a record, per {@link shape}. */
  value?: ModelProfile[] | Record<string, ModelProfile>
  onChange: (value: ModelProfile[] | Record<string, ModelProfile>) => void
  /** Which storage shape this list edits. */
  shape: ModelListShape
  /** The per-namespace field set to render per entry. */
  fields: readonly ModelField[]
  disabled?: boolean
  /** Wire protocol of the owning route; model compatibility follows it. */
  api?: string
  /** Endpoint facts used by the discovery dialog, when this list offers one. */
  probe?: DiscoveryProbe
  /** Locale key for the add button; a record list adds an override. */
  addKey?: string
}

const e = React.createElement

/**
 * Allocate an id that no sibling entry already uses.
 * @param base - the id to derive from; an empty base falls back to `model`.
 * @param taken - ids already in use.
 * @returns `<base>-copy`, then `<base>-copy-2`, and so on.
 */
export function uniqueCopyId(base: string, taken: Set<string>): string {
  const stem = base.length > 0 ? base : 'model'
  let candidate = `${stem}-copy`
  let counter = 2
  while (taken.has(candidate)) {
    candidate = `${stem}-copy-${counter}`
    counter += 1
  }
  return candidate
}

/**
 * One model list, for both storage shapes.
 *
 * Before this module the array list and the record list were separate files
 * with byte-identical clone, remove, add and set-field code. The mechanics are
 * shared here; the per-namespace field sets arrive as {@link ModelField}
 * descriptors, which is where the two genuinely differ.
 */
export function ModelList({
  value,
  onChange,
  shape,
  fields,
  disabled,
  api,
  probe,
  addKey,
}: ModelListProps) {
  const [discovering, setDiscovering] = React.useState(false)
  const list = Array.isArray(value) ? value : []
  const record = isObject(value) ? (value as Record<string, ModelProfile>) : {}
  const entries: Array<[string, ModelProfile]> =
    shape === 'record'
      ? Object.entries(record)
      : list.map(
          (item, index) => [String(index), item] as [string, ModelProfile],
        )
  const taken = new Set(
    entries.map(([, model]) => model.id).filter((id): id is string => !!id),
  )

  const replaceAt = (key: string, model: ModelProfile) => {
    if (shape === 'record') {
      onChange({ ...record, [key]: model })
      return
    }
    onChange(list.map((item, index) => (String(index) === key ? model : item)))
  }

  const insertAfter = (key: string, model: ModelProfile) => {
    if (shape === 'record') {
      // A record keeps insertion order, so rebuild it with the copy right after
      // its source instead of appending.
      const next: Record<string, ModelProfile> = {}
      for (const [id, entry] of Object.entries(record)) {
        next[id] = entry
        if (id === key) next[uniqueCopyId(id, taken)] = model
      }
      onChange(next)
      return
    }
    const index = Number(key)
    onChange([...list.slice(0, index + 1), model, ...list.slice(index + 1)])
  }

  const removeAt = (key: string) => {
    if (shape === 'record') {
      const next = { ...record }
      delete next[key]
      onChange(next)
      return
    }
    onChange(list.filter((_, index) => String(index) !== key))
  }

  const add = () => {
    if (shape === 'record') {
      onChange({ ...record, [uniqueCopyId('model', taken)]: {} })
      return
    }
    onChange([...list, { id: '' }])
  }

  return e(
    'div',
    { className: 'dsh-ma-wide' },
    entries.map(([key, model], index) =>
      e(
        'div',
        { className: 'dsh-ma-model', key: `${key}-${index}` },
        e(
          'div',
          { className: 'dsh-ma-model-head' },
          shape === 'record'
            ? e('input', {
                className: 'dsh-ma-input',
                style: { maxWidth: '320px' },
                value: key,
                disabled,
                placeholder: tr('models.override.idPlaceholder'),
                'aria-label': tr('models.override.idPlaceholder'),
                onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                  const next: Record<string, ModelProfile> = {}
                  for (const [id, entry] of Object.entries(record))
                    next[id === key ? event.target.value : id] = entry
                  onChange(next)
                },
              })
            : e(
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
                  const copied = clone(model)
                  if (copied.id) copied.id = uniqueCopyId(copied.id, taken)
                  insertAfter(key, copied)
                },
              },
              e(primitives.IconCopyOutlineRegular, { size: 16 }),
            ),
            e(
              'button',
              {
                type: 'button',
                className: 'dsh-ma-button dsh-ma-icon',
                disabled,
                title: tr('models.action.remove'),
                'aria-label': tr('models.action.remove'),
                onClick: () => removeAt(key),
              },
              e(primitives.IconCloseOutlineRegular, { size: 16 }),
            ),
          ),
        ),
        e(ModelFields, {
          model,
          fields,
          api,
          disabled,
          onChange: (next) => replaceAt(key, next),
        }),
      ),
    ),
    e(
      'div',
      { className: 'dsh-ma-toolbar', style: { marginTop: '8px' } },
      e(
        'button',
        {
          type: 'button',
          className: 'dsh-ma-button',
          disabled,
          onClick: add,
        },
        e(primitives.IconPlusOutlineRegular, { size: 14 }),
        tr(addKey ?? 'models.action.add'),
      ),
      shape === 'array' && probe
        ? e(
            'button',
            {
              type: 'button',
              className: 'dsh-ma-button',
              disabled: disabled || (!probe.provider && !probe.baseURL),
              onClick: () => setDiscovering(true),
            },
            tr('models.discovery.open'),
          )
        : null,
    ),
    discovering && probe
      ? e(ModelDiscoveryDialog, {
          probe,
          existing: taken,
          onClose: () => setDiscovering(false),
          onApply: (models) => {
            const known = new Set(taken)
            const additions: ModelProfile[] = []
            for (const model of models) {
              if (!model.id || known.has(model.id)) continue
              known.add(model.id)
              additions.push(discoveredModelProfile(model))
            }
            onChange([...list, ...additions])
            setDiscovering(false)
          },
        })
      : null,
  )
}
