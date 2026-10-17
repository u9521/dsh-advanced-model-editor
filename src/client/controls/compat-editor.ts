import * as React from 'react'
import type { CompatField } from '../compat.ts'
import {
  compatFields,
  compatValueConfigured,
  filterCompatForProtocol,
} from '../compat.ts'
import { tr } from '../i18n.ts'
import type { CompatProfile } from '../types.ts'
import { isObject } from '../utils.ts'
import { Field } from './field.ts'
import { Select, TextInput } from './inputs.ts'

export interface CompatEditorProps {
  value?: CompatProfile
  onChange?: (value: CompatProfile | undefined) => void
  disabled?: boolean
  api?: string
  titleKey?: string
  defaultOpen?: boolean
}

const e = React.createElement

/** Outcome of reading the JSON-object control's text. */
type ParseResult = { ok: true; value: unknown } | { ok: false }

/**
 * Read one JSON-object control's text.
 * @param text - the control's current text.
 * @returns the parsed value, or a failure the control reports.
 */
function parseJsonObject(text: string): ParseResult {
  if (text.trim().length === 0) return { ok: false }
  try {
    return { ok: true, value: JSON.parse(text) }
  } catch {
    return { ok: false }
  }
}

/**
 * Free-form JSON object control for `chatTemplateKwargs` / `chatTemplateArgs`.
 *
 * These two keys carry a dict whose shape the adapter's own schema owns, so the
 * control keeps the text and reports whether it parses instead of duplicating
 * that shape here. It is a module of its own because it is the only control that
 * holds text that may be invalid mid-typing.
 */
function JsonObjectField({
  field,
  value,
  disabled,
  onChange,
}: {
  field: CompatField
  value: unknown
  disabled?: boolean
  onChange: (value: unknown) => void
}) {
  const label = tr(`controls.compat.${field.key}`)
  const [text, setText] = React.useState(() =>
    value === undefined ? '' : JSON.stringify(value, null, 2),
  )
  const parsed = parseJsonObject(text)
  const blank = text.trim().length === 0
  return e(
    'div',
    { className: 'dsh-ma-field dsh-ma-wide' },
    e('span', { className: 'dsh-ma-field-label' }, label),
    e('textarea', {
      className: 'dsh-ma-input',
      rows: 4,
      spellCheck: false,
      value: text,
      disabled,
      placeholder: tr(`controls.compat.${field.key}Placeholder`),
      'aria-label': label,
      onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const next = event.target.value
        setText(next)
        if (next.trim().length === 0) {
          onChange(undefined)
          return
        }
        const result = parseJsonObject(next)
        if (result.ok) onChange(result.value)
      },
    }),
    blank || parsed.ok
      ? null
      : e(
          'span',
          { className: 'dsh-ma-route', role: 'alert' },
          tr('validation.json'),
        ),
  )
}

/**
 * The compatibility card for one route.
 *
 * The field set, the control kind per field and the protocol filter all come
 * from `../compat.ts`: this module renders the table rather than restating it,
 * so a field the adapter offers can no longer be allow-listed, validated and
 * yet missing a control.
 */
export function CompatEditor(props: CompatEditorProps) {
  const [open, setOpen] = React.useState(props.defaultOpen ?? false)
  // Read through a plain record: the key comes from the table, so the value is
  // only meaningful once `compatFields` has named it.
  const compat = (isObject(props.value) ? props.value : {}) as Record<
    string,
    unknown
  >
  const read = (key: string): unknown => compat[key]
  const fields = compatFields(props.api)
  const set = (field: string, value: unknown) => {
    const next: Record<string, unknown> = { ...compat }
    if (value === undefined || value === '') delete next[field]
    else next[field] = value
    props.onChange?.(filterCompatForProtocol(next as CompatProfile, props.api))
  }
  const configuredCount = Object.entries(compat).filter(
    ([key, value]) =>
      fields.some((field) => field.key === key) && compatValueConfigured(value),
  ).length

  const control = (field: CompatField) => {
    const labelKey = `controls.compat.${field.key}`
    if (field.kind === 'boolean')
      return e(
        Field,
        { labelKey, key: field.key },
        e(Select, {
          value:
            typeof read(field.key) === 'boolean'
              ? String(read(field.key))
              : undefined,
          choices: [
            { value: 'true', labelKey: 'controls.boolean.supported' },
            { value: 'false', labelKey: 'controls.boolean.unsupported' },
          ],
          disabled: props.disabled,
          unsetKey: 'controls.select.auto',
          onChange: (value) =>
            set(field.key, value === undefined ? undefined : value === 'true'),
        }),
      )
    if (field.kind === 'enum')
      return e(
        Field,
        { labelKey, key: field.key },
        e(Select, {
          value:
            typeof read(field.key) === 'string'
              ? (read(field.key) as string)
              : undefined,
          choices: [...(field.choices ?? [])],
          disabled: props.disabled,
          unsetKey: 'controls.select.auto',
          onChange: (value) => set(field.key, value),
        }),
      )
    if (field.kind === 'integer')
      return e(
        Field,
        { labelKey, key: field.key },
        e(TextInput, {
          type: 'number',
          step: 1,
          value: read(field.key) as number | undefined,
          placeholderKey: `${labelKey}Placeholder`,
          disabled: props.disabled,
          onChange: (value) =>
            set(
              field.key,
              typeof value === 'number' && Number.isFinite(value)
                ? Math.trunc(value)
                : undefined,
            ),
        }),
      )
    return e(JsonObjectField, {
      key: field.key,
      field,
      value: read(field.key),
      disabled: props.disabled,
      onChange: (value) => set(field.key, value),
    })
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
        e('span', null, tr(props.titleKey || 'controls.compat.title')),
        configuredCount > 0
          ? e(
              'span',
              { className: 'dsh-ma-tag' },
              tr('controls.compat.configuredCount', { count: configuredCount }),
            )
          : null,
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
          { className: 'dsh-ma-card-body' },
          e(
            'div',
            { className: 'dsh-ma-grid' },
            fields.map((field) => control(field)),
          ),
        )
      : null,
  )
}
