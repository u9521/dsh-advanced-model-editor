import * as React from 'react'
import { tr } from '../utils.ts'

export interface FieldProps {
  labelKey: string
  labelVars?: Record<string, string | number>
  wide?: boolean
  enabled?: boolean
  readOnly?: boolean
  onEnabled?: (value: boolean) => void
  children?: React.ReactNode
}

const e = React.createElement

export function Field(props: FieldProps) {
  const label = tr(props.labelKey, props.labelVars)
  return e(
    'div',
    { className: 'dsh-ma-field' + (props.wide ? ' dsh-ma-wide' : '') },
    e(
      'div',
      { className: 'dsh-ma-field-label' },
      props.onEnabled
        ? e('input', {
            className: 'dsh-ma-override',
            type: 'checkbox',
            checked: props.enabled === true,
            disabled: props.readOnly === true,
            'aria-label': tr('controls.field.override', {
              label,
            }),
            onChange: (event) => props.onEnabled?.(event.target.checked),
          })
        : null,
      e('span', null, label),
    ),
    props.children,
  )
}
