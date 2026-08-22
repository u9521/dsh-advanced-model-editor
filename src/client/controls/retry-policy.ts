import * as React from 'react'
import { DEFAULT_RETRYABLE_CODES, MAX_TIMER_DELAY_MS } from '../constants.ts'
import type { BackoffConfig, RetryPolicyConfig } from '../types.ts'
import { isObject } from '../utils.ts'
import { Field } from './field.ts'
import { Select, TextInput } from './inputs.ts'

export interface RetryPolicyProps {
  value?: RetryPolicyConfig
  onChange?: (value: RetryPolicyConfig) => void
  disabled?: boolean
}

const e = React.createElement

export function RetryPolicy(props: RetryPolicyProps) {
  const policy = (
    isObject(props.value)
      ? props.value
      : {
          mode: 'normal',
          maxRetries: 2,
          retryableCodes: [...DEFAULT_RETRYABLE_CODES],
          backoff: {
            initialDelayMs: 500,
            maxDelayMs: 10000,
            jitterRatio: 0.1,
          },
        }
  ) as RetryPolicyConfig & Record<string, unknown>
  const backoff = (
    isObject(policy.backoff) ? policy.backoff : {}
  ) as BackoffConfig
  const set = (field: string, value: unknown) =>
    props.onChange?.({ ...policy, [field]: value } as RetryPolicyConfig)
  const setBackoff = (field: string, value: unknown) =>
    props.onChange?.({
      ...policy,
      backoff: { ...backoff, [field]: value },
    } as RetryPolicyConfig)
  return e(
    'div',
    { className: 'dsh-ma-grid dsh-ma-wide' },
    e(
      Field,
      { labelKey: 'controls.retry.modeLabel' },
      e(Select, {
        value: policy.mode === 'always' ? 'always' : 'normal',
        allowUnset: false,
        disabled: props.disabled,
        choices: [
          { value: 'normal', labelKey: 'controls.retry.mode.normal' },
          { value: 'always', labelKey: 'controls.retry.mode.always' },
        ],
        onChange: (mode) =>
          props.onChange?.(
            mode === 'always'
              ? { mode: 'always', backoff }
              : {
                  mode: 'normal',
                  maxRetries:
                    policy.maxRetries === undefined ? 2 : policy.maxRetries,
                  retryableCodes: policy.retryableCodes || [
                    ...DEFAULT_RETRYABLE_CODES,
                  ],
                  backoff,
                },
          ),
      }),
    ),
    policy.mode !== 'always'
      ? e(
          Field,
          { labelKey: 'controls.retry.maxRetries' },
          e(TextInput, {
            type: 'number',
            min: 0,
            step: 1,
            value: policy.maxRetries,
            disabled: props.disabled,
            onChange: (value) => set('maxRetries', value),
          }),
        )
      : null,
    policy.mode !== 'always'
      ? e(
          Field,
          { labelKey: 'controls.retry.retryableCodes', wide: true },
          e(TextInput, {
            value: Array.isArray(policy.retryableCodes)
              ? policy.retryableCodes.join(', ')
              : '',
            disabled: props.disabled,
            emptyAsUndefined: false,
            onChange: (value) =>
              set(
                'retryableCodes',
                String(value)
                  .split(/[,\s]+/)
                  .map((item) => item.trim())
                  .filter(Boolean),
              ),
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
