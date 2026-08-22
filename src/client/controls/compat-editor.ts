import * as React from 'react'
import {
  CACHE_CONTROL_FORMATS,
  MAX_TOKENS_FIELDS,
  PROTOCOL_COMPAT_FIELDS,
  THINKING_FORMATS,
} from '../constants.ts'
import type { CompatProfile } from '../types.ts'
import { isObject, tr } from '../utils.ts'
import { Field } from './field.ts'
import { Select } from './inputs.ts'

export interface CompatEditorProps {
  value?: CompatProfile
  onChange?: (value: CompatProfile | undefined) => void
  disabled?: boolean
  api?: string
  titleKey?: string
  defaultOpen?: boolean
}

const e = React.createElement

export function CompatEditor(props: CompatEditorProps) {
  const [open, setOpen] = React.useState(props.defaultOpen ?? false)
  const compat = (isObject(props.value) ? props.value : {}) as CompatProfile
  const set = (field: string, value: unknown) => {
    const next = { ...compat }
    if (value === undefined || value === '')
      delete next[field as keyof CompatProfile]
    else next[field as keyof CompatProfile] = value as never
    const cleanKeys = Object.entries(next).filter(([_, v]) => {
      if (v === undefined || v === null || v === '') return false
      if (
        typeof v === 'object' &&
        !Array.isArray(v) &&
        Object.keys(v).length === 0
      )
        return false
      return true
    })
    props.onChange?.(cleanKeys.length === 0 ? undefined : next)
  }

  const allowed =
    PROTOCOL_COMPAT_FIELDS[props.api || 'openai-completions'] ||
    PROTOCOL_COMPAT_FIELDS['openai-completions']

  const configuredCount = Object.entries(compat).filter(([key, value]) => {
    if (!allowed.includes(key)) return false
    if (value === undefined || value === null || value === '') return false
    if (
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value).length === 0
    )
      return false
    return true
  }).length

  const boolSelect = (name: keyof CompatProfile, labelKey: string) =>
    e(
      Field,
      { labelKey, key: name },
      e(Select, {
        value:
          typeof compat[name] === 'boolean' ? String(compat[name]) : undefined,
        choices: [
          { value: 'true', labelKey: 'controls.boolean.supported' },
          { value: 'false', labelKey: 'controls.boolean.unsupported' },
        ],
        disabled: props.disabled,
        unsetKey: 'controls.select.auto',
        onChange: (value) =>
          set(name, value === undefined ? undefined : value === 'true'),
      }),
    )

  let gridContent: React.ReactNode = null

  if (props.api === 'anthropic-messages') {
    gridContent = e(
      'div',
      { className: 'dsh-ma-grid' },
      boolSelect('supportsTemperature', 'controls.compat.supportsTemperature'),
      boolSelect(
        'forceAdaptiveThinking',
        'controls.compat.forceAdaptiveThinking',
      ),
      boolSelect(
        'supportsEagerToolInputStreaming',
        'controls.compat.supportsEagerToolInputStreaming',
      ),
      boolSelect(
        'supportsCacheControlOnTools',
        'controls.compat.supportsCacheControlOnTools',
      ),
      boolSelect('allowEmptySignature', 'controls.compat.allowEmptySignature'),
      boolSelect('supportsStrictTools', 'controls.compat.supportsStrictTools'),
      boolSelect(
        'supportsLongCacheRetention',
        'controls.compat.supportsLongCacheRetention',
      ),
    )
  } else if (props.api === 'openai-responses') {
    gridContent = e(
      'div',
      { className: 'dsh-ma-grid' },
      boolSelect(
        'supportsDeveloperRole',
        'controls.compat.supportsDeveloperRole',
      ),
      boolSelect('supportsStrictMode', 'controls.compat.supportsStrictMode'),
      boolSelect(
        'supportsLongCacheRetention',
        'controls.compat.supportsLongCacheRetention',
      ),
    )
  } else {
    // openai-completions or default
    gridContent = e(
      'div',
      { className: 'dsh-ma-grid' },
      e(
        Field,
        { labelKey: 'controls.compat.thinkingFormat' },
        e(Select, {
          value: compat.thinkingFormat,
          choices: [...THINKING_FORMATS],
          choiceKeyPrefix: 'controls.thinkingFormat',
          disabled: props.disabled,
          unsetKey: 'controls.select.auto',
          onChange: (value) => set('thinkingFormat', value),
        }),
      ),
      boolSelect(
        'supportsReasoningEffort',
        'controls.compat.supportsReasoningEffort',
      ),
      boolSelect(
        'supportsDeveloperRole',
        'controls.compat.supportsDeveloperRole',
      ),
      e(
        Field,
        { labelKey: 'controls.compat.maxTokensField' },
        e(Select, {
          value: compat.maxTokensField,
          choices: [...MAX_TOKENS_FIELDS],
          choiceKeyPrefix: 'controls.maxTokensField',
          disabled: props.disabled,
          unsetKey: 'controls.select.auto',
          onChange: (value) => set('maxTokensField', value),
        }),
      ),
      boolSelect(
        'supportsUsageInStreaming',
        'controls.compat.supportsUsageInStreaming',
      ),
      boolSelect('supportsStore', 'controls.compat.supportsStore'),
      boolSelect('supportsStrictMode', 'controls.compat.supportsStrictMode'),
      boolSelect(
        'supportsLongCacheRetention',
        'controls.compat.supportsLongCacheRetention',
      ),
      e(
        Field,
        { labelKey: 'controls.compat.cacheControlFormat' },
        e(Select, {
          value: compat.cacheControlFormat,
          choices: [...CACHE_CONTROL_FORMATS],
          choiceKeyPrefix: 'controls.cacheControlFormat',
          disabled: props.disabled,
          unsetKey: 'controls.select.auto',
          onChange: (value) => set('cacheControlFormat', value),
        }),
      ),
      boolSelect(
        'requiresToolResultName',
        'controls.compat.requiresToolResultName',
      ),
      boolSelect(
        'requiresAssistantAfterToolResult',
        'controls.compat.requiresAssistantAfterToolResult',
      ),
      boolSelect(
        'requiresThinkingAsText',
        'controls.compat.requiresThinkingAsText',
      ),
      boolSelect(
        'requiresReasoningContentOnAssistantMessages',
        'controls.compat.requiresReasoningContentOnAssistantMessages',
      ),
    )
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
    open ? e('div', { className: 'dsh-ma-card-body' }, gridContent) : null,
  )
}
