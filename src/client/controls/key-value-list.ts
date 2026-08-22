import * as React from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import { THINKING_LEVELS } from '../constants.ts'
import { isObject, tr } from '../utils.ts'
import { Select, TextInput } from './inputs.ts'

export interface KeyValueListProps {
  kind: 'headers' | 'efforts' | 'budgets'
  value?: Record<string, string | number | null>
  onChange?: (value: Record<string, string | number | null>) => void
  disabled?: boolean
}

const e = React.createElement

export function KeyValueList(props: KeyValueListProps) {
  const values = isObject(props.value) ? props.value : {}
  const levels = props.kind === 'efforts'
  const entries = levels
    ? Object.entries(values).sort(([a], [b]) => {
        const indexA = THINKING_LEVELS.indexOf(a as any)
        const indexB = THINKING_LEVELS.indexOf(b as any)
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB)
      })
    : Object.entries(values)

  const sortEfforts = (record: Record<string, string | number | null>) => {
    const sorted: Record<string, string | number | null> = {}
    for (const level of THINKING_LEVELS) {
      if (Object.prototype.hasOwnProperty.call(record, level)) {
        sorted[level] = record[level]
      }
    }
    for (const [k, v] of Object.entries(record)) {
      if (!Object.prototype.hasOwnProperty.call(sorted, k)) {
        sorted[k] = v
      }
    }
    return sorted
  }

  const setEntry = (
    from: string,
    to: string | number | undefined,
    nextValue: string | number | null | undefined,
  ) => {
    const next: Record<string, string | number | null> = {}
    for (const [key, value] of entries)
      next[(key === from ? to : key) as string] =
        key === from ? (nextValue as string | number | null) : value
    props.onChange?.(levels ? sortEfforts(next) : next)
  }

  const add = () => {
    if (levels) {
      const available = THINKING_LEVELS.find(
        (level) => !Object.prototype.hasOwnProperty.call(values, level),
      )
      if (available !== undefined)
        props.onChange?.(
          sortEfforts({
            ...values,
            [available]: available === 'off' ? null : available,
          }),
        )
      return
    }
    let index = 1
    let name = 'X-Custom-' + index
    while (Object.prototype.hasOwnProperty.call(values, name)) {
      index += 1
      name = 'X-Custom-' + index
    }
    props.onChange?.({ ...values, [name]: '' })
  }
  return e(
    'div',
    { className: 'dsh-ma-wide' },
    entries.map(([key, value], index) =>
      e(
        'div',
        { className: 'dsh-ma-kv', key: key + '-' + index },
        levels
          ? e(Select, {
              value: key,
              disabled: props.disabled,
              allowUnset: false,
              choices: [...THINKING_LEVELS],
              choiceKeyPrefix: 'controls.reasoningLevel',
              onChange: (nextKey) => setEntry(key, nextKey, value),
            })
          : e(TextInput, {
              value: key,
              disabled: props.disabled,
              emptyAsUndefined: false,
              placeholderKey: 'controls.keyValue.headers.keyPlaceholder',
              onChange: (nextKey) => setEntry(key, nextKey, value),
            }),
        e(TextInput, {
          value: value === null ? '' : value,
          disabled: props.disabled,
          emptyAsUndefined: false,
          placeholderKey:
            levels && key === 'off'
              ? 'controls.keyValue.efforts.offValuePlaceholder'
              : levels
                ? 'controls.keyValue.efforts.valuePlaceholder'
                : 'controls.keyValue.headers.valuePlaceholder',
          onChange: (nextValue) =>
            setEntry(
              key,
              key,
              levels && key === 'off' && nextValue === '' ? null : nextValue,
            ),
        }),
        e(
          'button',
          {
            type: 'button',
            className: 'dsh-ma-button dsh-ma-icon',
            disabled: props.disabled === true,
            title: tr('controls.keyValue.remove'),
            'aria-label': tr('controls.keyValue.remove'),
            onClick: () => {
              const next = { ...values }
              delete next[key]
              props.onChange?.(next)
            },
          },
          e(primitives.IconCloseOutline16, { size: 16 }),
        ),
      ),
    ),
    e(
      'button',
      {
        type: 'button',
        className: 'dsh-ma-button',
        disabled:
          props.disabled === true ||
          (levels && entries.length === THINKING_LEVELS.length),
        style: { marginTop: '8px' },
        onClick: add,
      },
      e(primitives.IconPlusOutline16, { size: 14 }),
      tr(
        levels
          ? 'controls.keyValue.efforts.add'
          : 'controls.keyValue.headers.add',
      ),
    ),
  )
}
