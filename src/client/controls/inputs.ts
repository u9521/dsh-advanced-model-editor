import * as React from 'react'
import { PROTOCOLS } from '../constants.ts'
import { formatCapacity, parseCapacity, tr } from '../utils.ts'

export interface TextInputProps {
  type?: string
  value?: string | number | null
  className?: string
  disabled?: boolean
  placeholder?: string
  placeholderKey?: string
  placeholderVars?: Record<string, string | number>
  ariaLabelKey?: string
  ariaLabelVars?: Record<string, string | number>
  autoComplete?: string
  emptyAsUndefined?: boolean
  min?: number
  max?: number
  step?: number
  onChange?: (value: string | number | undefined) => void
}

export interface CapacityInputProps {
  value?: number
  disabled?: boolean
  placeholder?: string
  placeholderKey?: string
  placeholderVars?: Record<string, string | number>
  ariaLabelKey?: string
  ariaLabelVars?: Record<string, string | number>
  onChange?: (value: number | undefined) => void
}

export interface SelectProps {
  value?: string
  onChange?: (value: string | undefined) => void
  disabled?: boolean
  className?: string
  ariaLabelKey?: string
  ariaLabelVars?: Record<string, string | number>
  allowUnset?: boolean
  unsetKey?: string
  choiceKeyPrefix?: string
  choices?: Array<
    | string
    | {
        value: string
        label?: string
        labelKey?: string
        labelVars?: Record<string, string | number>
      }
  >
  unsetLabel?: string
}

export interface ProtocolSelectProps {
  value?: string
  onChange?: (value: string | undefined) => void
  disabled?: boolean
  allowUnset?: boolean
  unsetKey?: string
  ariaLabelKey?: string
}

const e = React.createElement

function option(
  value: string,
  labelKey: string | undefined,
  labelVars?: Record<string, string | number>,
) {
  return e(
    'option',
    { key: String(value), value },
    tr(labelKey ?? '', labelVars),
  )
}

export function TextInput(props: TextInputProps) {
  const type = props.type || 'text'
  return e('input', {
    className: 'dsh-ma-input' + (props.className ? ' ' + props.className : ''),
    type,
    value:
      props.value === undefined || props.value === null
        ? ''
        : String(props.value),
    disabled: props.disabled === true,
    placeholder: props.placeholderKey
      ? tr(props.placeholderKey, props.placeholderVars)
      : props.placeholder,
    'aria-label': props.ariaLabelKey
      ? tr(props.ariaLabelKey, props.ariaLabelVars)
      : undefined,
    min: props.min,
    max: props.max,
    step: props.step,
    autoComplete: props.autoComplete,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value
      props.onChange?.(
        type === 'number'
          ? raw === ''
            ? undefined
            : Number(raw)
          : raw === '' && props.emptyAsUndefined !== false
            ? undefined
            : raw,
      )
    },
  })
}

export function CapacityInput(props: CapacityInputProps) {
  const [buffer, setBuffer] = React.useState<string | undefined>(undefined)
  React.useEffect(() => {
    setBuffer((current) => {
      if (current === undefined) return current
      const parsed = parseCapacity(current)
      const synced =
        parsed === undefined
          ? props.value === undefined
          : parsed === props.value
      return synced ? current : undefined
    })
  }, [props.value])
  const display =
    buffer ?? (props.value === undefined ? '' : formatCapacity(props.value))
  return e('input', {
    className: 'dsh-ma-input',
    type: 'text',
    inputMode: 'numeric',
    value: display,
    disabled: props.disabled === true,
    placeholder: props.placeholderKey
      ? tr(props.placeholderKey, props.placeholderVars)
      : props.placeholder,
    'aria-label': props.ariaLabelKey
      ? tr(props.ariaLabelKey, props.ariaLabelVars)
      : undefined,
    onBlur: () => setBuffer(undefined),
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value
      setBuffer(raw)
      const parsed = parseCapacity(raw)
      if (parsed === undefined) props.onChange?.(undefined)
      else if (!Number.isNaN(parsed)) props.onChange?.(parsed)
    },
  })
}

export function Select(props: SelectProps) {
  const choices = Array.isArray(props.choices) ? props.choices : []
  return e(
    'select',
    {
      className:
        'dsh-ma-select' + (props.className ? ' ' + props.className : ''),
      value:
        props.value === undefined || props.value === null
          ? ''
          : String(props.value),
      disabled: props.disabled === true,
      'aria-label': props.ariaLabelKey
        ? tr(props.ariaLabelKey, props.ariaLabelVars)
        : undefined,
      onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
        props.onChange?.(
          event.target.value === '' ? undefined : event.target.value,
        ),
    },
    props.allowUnset === false
      ? null
      : option('', props.unsetKey || 'controls.select.unset'),
    choices.map((choice) => {
      const value = typeof choice === 'string' ? choice : choice.value
      const labelKey =
        typeof choice === 'string'
          ? props.choiceKeyPrefix
            ? props.choiceKeyPrefix + '.' + choice
            : choice
          : choice.labelKey
      return option(
        value,
        labelKey,
        typeof choice === 'string' ? undefined : choice.labelVars,
      )
    }),
  )
}

export function ProtocolSelect(props: ProtocolSelectProps) {
  return e(Select, {
    value: props.value || 'openai-completions',
    onChange: props.onChange,
    disabled: props.disabled,
    allowUnset: props.allowUnset ?? false,
    choices: [...PROTOCOLS],
    choiceKeyPrefix: 'controls.protocol',
    unsetKey: props.unsetKey || 'controls.select.unset',
    ariaLabelKey: props.ariaLabelKey || 'controls.protocol.label',
  })
}
