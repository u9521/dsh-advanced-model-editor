import * as React from 'react'
import { DEFAULT_RETRYABLE_CODES, MAX_TIMER_DELAY_MS } from '../constants.ts'
import type { BackoffConfig, RetryMode, RetryPolicyConfig } from '../types.ts'
import { isObject } from '../utils.ts'
import { Field } from './field.ts'
import { Select, TextInput } from './inputs.ts'

export interface RetryPolicyProps {
  value?: RetryPolicyConfig
  onChange?: (value: RetryPolicyConfig) => void
  disabled?: boolean
}

const e = React.createElement

/** Default bounded policy written when a route first enables retries. */
const DEFAULT_BACKOFF: BackoffConfig = {
  initialDelayMs: 500,
  maxDelayMs: 10000,
  jitterRatio: 0.1,
}

/** Loose draft carrying whichever bounded-only fields the caller wants to write. */
interface RetryDraft {
  mode: RetryMode
  backoff?: BackoffConfig
  maxRetries?: number
  retryableCodes?: string[]
}

export function RetryPolicy(props: RetryPolicyProps) {
  // Read the stored value loosely: it is untrusted wire data, and the two
  // policy shapes share only `mode` and `backoff`.
  const stored: Record<string, unknown> = isObject(props.value)
    ? props.value
    : {}
  const mode: RetryMode = stored.mode === 'always' ? 'always' : 'normal'
  const maxRetries =
    typeof stored.maxRetries === 'number' ? stored.maxRetries : undefined
  const retryableCodes = Array.isArray(stored.retryableCodes)
    ? (stored.retryableCodes as string[])
    : undefined
  const backoff: BackoffConfig = isObject(stored.backoff)
    ? (stored.backoff as BackoffConfig)
    : {}

  /** Emit one well-formed policy, defaulting the bounded-only fields. */
  const emit = (next: RetryDraft) =>
    props.onChange?.(
      next.mode === 'always'
        ? { mode: 'always', backoff: next.backoff ?? backoff }
        : {
            mode: 'normal',
            maxRetries: next.maxRetries ?? 2,
            retryableCodes: next.retryableCodes ?? [...DEFAULT_RETRYABLE_CODES],
            backoff: next.backoff ?? backoff,
          },
    )
  const setBackoff = (field: keyof BackoffConfig, value: unknown) =>
    emit({ mode, backoff: { ...backoff, [field]: value } })

  return e(
    'div',
    { className: 'dsh-ma-grid dsh-ma-wide' },
    e(
      Field,
      { labelKey: 'controls.retry.modeLabel' },
      e(Select, {
        value: mode,
        allowUnset: false,
        disabled: props.disabled,
        choices: [
          { value: 'normal', labelKey: 'controls.retry.mode.normal' },
          { value: 'always', labelKey: 'controls.retry.mode.always' },
        ],
        onChange: (next) =>
          emit({ mode: next === 'always' ? 'always' : 'normal' }),
      }),
    ),
    mode === 'normal'
      ? e(
          Field,
          { labelKey: 'controls.retry.maxRetries' },
          e(TextInput, {
            type: 'number',
            min: 0,
            step: 1,
            value: maxRetries,
            disabled: props.disabled,
            onChange: (value) =>
              emit({
                mode: 'normal',
                maxRetries: typeof value === 'number' ? value : undefined,
              }),
          }),
        )
      : null,
    mode === 'normal'
      ? e(
          Field,
          { labelKey: 'controls.retry.retryableCodes', wide: true },
          e(TextInput, {
            value: Array.isArray(retryableCodes)
              ? retryableCodes.join(', ')
              : '',
            disabled: props.disabled,
            emptyAsUndefined: false,
            onChange: (value) =>
              emit({
                mode: 'normal',
                retryableCodes: String(value)
                  .split(/[,\s]+/)
                  .map((item) => item.trim())
                  .filter(Boolean),
              }),
          }),
        )
      : null,
    e(
      Field,
      { labelKey: 'controls.retry.initialDelayMs' },
      e(TextInput, {
        type: 'number',
        min: 1,
        max: MAX_TIMER_DELAY_MS,
        value: backoff.initialDelayMs,
        disabled: props.disabled,
        onChange: (value) => setBackoff('initialDelayMs', value),
      }),
    ),
    e(
      Field,
      { labelKey: 'controls.retry.maxDelayMs' },
      e(TextInput, {
        type: 'number',
        min: 1,
        max: MAX_TIMER_DELAY_MS,
        value: backoff.maxDelayMs,
        disabled: props.disabled,
        onChange: (value) => setBackoff('maxDelayMs', value),
      }),
    ),
    e(
      Field,
      { labelKey: 'controls.retry.jitterRatio' },
      e(TextInput, {
        type: 'number',
        min: 0,
        max: 1,
        step: 0.01,
        value: backoff.jitterRatio,
        disabled: props.disabled,
        onChange: (value) => setBackoff('jitterRatio', value),
      }),
    ),
  )
}
