import * as React from 'react'
import { MODALITIES } from '../constants.ts'
import { tr } from '../utils.ts'

export interface ModalitiesProps {
  value?: string[]
  onChange?: (value: string[]) => void
  disabled?: boolean
}

const e = React.createElement

export function Modalities(props: ModalitiesProps) {
  const selected = Array.isArray(props.value) ? props.value : []
  return e(
    'div',
    { className: 'dsh-ma-checks' },
    MODALITIES.map((item) =>
      e(
        'label',
        { key: item, className: 'dsh-ma-check' },
        e('input', {
          type: 'checkbox',
          checked: selected.includes(item),
          disabled: props.disabled === true,
          onChange: (event) =>
            props.onChange?.(
              event.target.checked
                ? [...selected, item]
                : selected.filter((entry) => entry !== item),
            ),
        }),
        tr('controls.modality.' + item),
      ),
    ),
  )
}
