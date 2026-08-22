import * as React from 'react'
import type { ReasoningEfforts } from '../types.ts'
import { createDefaultReasoningEfforts, isObject, tr } from '../utils.ts'
import { Select } from './inputs.ts'
import { KeyValueList } from './key-value-list.ts'

export interface ReasoningEffortsEditorProps {
  value?: false | ReasoningEfforts
  onChange: (value: false | ReasoningEfforts | undefined) => void
  disabled?: boolean
  titleKey?: string
  defaultOpen?: boolean
}

const e = React.createElement

export function ReasoningEffortsEditor(props: ReasoningEffortsEditorProps) {
  const [open, setOpen] = React.useState(props.defaultOpen ?? false)
  const isCustom = isObject(props.value)
  const mode =
    props.value === false ? 'disabled' : isCustom ? 'custom' : 'inherit'

  const configuredCount = isObject(props.value)
    ? Object.keys(props.value).length
    : 0

  let badgeText = tr('models.reasoning.inherit')
  if (mode === 'disabled') {
    badgeText = tr('models.reasoning.disabled')
  } else if (mode === 'custom') {
    badgeText = tr('models.reasoning.customCount', { count: configuredCount })
  }

  const handleModeChange = (nextMode: string | undefined) => {
    if (nextMode === 'inherit') {
      props.onChange(undefined)
    } else if (nextMode === 'disabled') {
      props.onChange(false)
    } else if (nextMode === 'custom') {
      props.onChange(createDefaultReasoningEfforts())
    }
  }

  return e(
    'div',
    { className: 'dsh-ma-card' },
    e(
      'div',
      {
        className: 'dsh-ma-card-head',
        role: 'button',
        tabIndex: 0,
        'aria-expanded': open,
        onClick: () => setOpen((prev) => !prev),
        onKeyDown: (event: React.KeyboardEvent) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setOpen((prev) => !prev)
          }
        },
      },
      e(
        'div',
        { className: 'dsh-ma-card-title' },
        e('span', null, tr(props.titleKey || 'models.field.reasoningEfforts')),
        e('span', { className: 'dsh-ma-tag' }, badgeText),
      ),
      e(
        'button',
        {
          type: 'button',
          className: 'dsh-ma-button',
          style: {
            height: '26px',
            minHeight: '26px',
            fontSize: '12px',
            padding: '0 8px',
          },
          disabled: props.disabled,
          'aria-expanded': open,
          onClick: (event: React.MouseEvent) => {
            event.stopPropagation()
            setOpen((prev) => !prev)
          },
        },
        tr(open ? 'action.collapse' : 'action.expand'),
      ),
    ),
    open
      ? e(
          'div',
          {
            className: 'dsh-ma-card-body',
            style: { display: 'flex', flexDirection: 'column', gap: '10px' },
          },
          e(Select, {
            value: mode,
            disabled: props.disabled,
            allowUnset: false,
            choices: [
              { value: 'inherit', labelKey: 'models.reasoning.inherit' },
              { value: 'disabled', labelKey: 'models.reasoning.disabled' },
              { value: 'custom', labelKey: 'models.reasoning.custom' },
            ],
            onChange: handleModeChange,
          }),
          isCustom
            ? e(KeyValueList, {
                kind: 'efforts',
                value: props.value as Record<string, string | number | null>,
                disabled: props.disabled,
                onChange: (nextValue) =>
                  props.onChange(nextValue as ReasoningEfforts),
              })
            : null,
        )
      : null,
  )
}
