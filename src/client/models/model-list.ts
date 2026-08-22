import * as React from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import type { ModelProfile } from '../types.ts'
import { clone, isObject, tr } from '../utils.ts'
import { DiscoveryProbe, ModelDiscoveryDialog } from './discovery-dialog.ts'
import { ModelForm } from './model-form.ts'

export interface ModelListProps {
  value?: ModelProfile[] | Record<string, ModelProfile>
  onChange: (value: ModelProfile[] | Record<string, ModelProfile>) => void
  disabled?: boolean
  override?: boolean
  probe?: DiscoveryProbe
  /** Wire protocol of the owning route; model compatibility only applies to supported protocols. */
  api?: string
}

const e = React.createElement

export function ModelList({
  value,
  onChange,
  disabled,
  override,
  probe,
  api,
}: ModelListProps) {
  const [discovering, setDiscovering] = React.useState(false)
  const list = Array.isArray(value) ? value : []
  const entries: Array<[string, ModelProfile]> = override
    ? (Object.entries(isObject(value) ? value : {}) as Array<
        [string, ModelProfile]
      >)
    : list.map((item, index) => [String(index), item] as [string, ModelProfile])
  const update = (key: string, model: ModelProfile) =>
    override
      ? onChange({ ...(value || {}), [key]: model })
      : onChange(
          list.map((item, index) => (String(index) === key ? model : item)),
        )
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
          override
            ? e('input', {
                className: 'dsh-ma-input',
                style: { maxWidth: '320px' },
                value: key,
                disabled,
                placeholder: tr('models.override.idPlaceholder'),
                onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                  const next: Record<string, ModelProfile> = {}
                  for (const [id, item] of Object.entries(value || {}))
                    next[id === key ? event.target.value : id] =
                      item as ModelProfile
                  onChange(next)
                },
              })
            : e(
                'span',
                { className: 'dsh-ma-model-title' },
                model.id ||
                  tr('models.item.fallback', {
                    index: index + 1,
                  }),
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
                  if (override) {
                    const next: Record<string, ModelProfile> = {}
                    for (const [id, item] of Object.entries(value || {})) {
                      next[id] = item as ModelProfile
                      if (id === key) {
                        let copyId = `${key}-copy`
                        let counter = 2
                        while (
                          Object.prototype.hasOwnProperty.call(
                            value || {},
                            copyId,
                          ) ||
                          Object.prototype.hasOwnProperty.call(next, copyId)
                        ) {
                          copyId = `${key}-copy-${counter}`
                          counter += 1
                        }
                        next[copyId] = clone(item as ModelProfile)
                      }
                    }
                    onChange(next)
                  } else {
                    const cloned = clone(model)
                    if (cloned.id) {
                      const existingIds = new Set(
                        list
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
                    const nextList = [
                      ...list.slice(0, index + 1),
                      cloned,
                      ...list.slice(index + 1),
                    ]
                    onChange(nextList)
                  }
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
                onClick: () => {
                  if (override) {
                    const next = {
                      ...(value || {}),
                    } as Record<string, ModelProfile>
                    delete next[key]
                    onChange(next)
                  } else
                    onChange(list.filter((_, itemIndex) => itemIndex !== index))
                },
              },
              e(primitives.IconCloseOutline16, { size: 16 }),
            ),
          ),
        ),
        e(ModelForm, {
          model,
          includeId: !override,
          disabled,
          api,
          onChange: (next) => update(key, next),
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
          onClick: () => {
            if (!override) return onChange([...list, { id: '' }])
            let index = 1
            let id = `model-${index}`
            while (Object.prototype.hasOwnProperty.call(value || {}, id)) {
              index += 1
              id = `model-${index}`
            }
            onChange({ ...(value || {}), [id]: {} })
          },
        },
        e(primitives.IconPlusOutline16, { size: 14 }),
        tr(override ? 'models.action.addOverride' : 'models.action.add'),
      ),
      !override && probe
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
          existing: new Set(
            list
              .map((model) => model.id)
              .filter((id): id is string => Boolean(id)),
          ),
          onClose: () => setDiscovering(false),
          onApply: (models) => {
            const known = new Set(
              list
                .map((model) => model.id)
                .filter((id): id is string => Boolean(id)),
            )
            const additions: ModelProfile[] = []
            for (const model of models) {
              if (!model.id || known.has(model.id)) continue
              known.add(model.id)
              additions.push({
                id: model.id,
                ...(model.name ? { name: model.name } : {}),
                ...(typeof model.contextWindow === 'number'
                  ? { contextWindow: model.contextWindow }
                  : {}),
                ...(typeof model.maxTokens === 'number'
                  ? { maxTokens: model.maxTokens }
                  : {}),
              })
            }
            onChange([...list, ...additions])
            setDiscovering(false)
          },
        })
      : null,
  )
}
