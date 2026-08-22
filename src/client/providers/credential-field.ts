import * as React from 'react'
import { TextInput } from '../controls/index.ts'
import type { ModelApi } from '../types.ts'
import { tr } from '../utils.ts'

export interface CredentialFieldProps {
  api: ModelApi
  keyRef: string
  revision: number
  value: string
  onChange: (value: string | number | undefined) => void
  disabled?: boolean
}

const e = React.createElement

export function CredentialField({
  api,
  keyRef,
  revision,
  value,
  onChange,
  disabled,
}: CredentialFieldProps) {
  const [state, setState] = React.useState<{ configured?: boolean }>()
  React.useEffect(() => {
    let active = true
    api.credentials.describe({ refs: [keyRef] }).then(
      (response) => {
        if (active && response.result.ok)
          setState(
            (
              response.result.value as {
                credentials: Record<string, { configured?: boolean }>
              }
            ).credentials[keyRef],
          )
      },
      () => undefined,
    )
    return () => {
      active = false
    }
  }, [api, keyRef, revision])
  return e(
    'label',
    { className: 'dsh-ma-field' },
    e(
      'span',
      { className: 'dsh-ma-field-label' },
      tr('credential.label', {
        status: tr(
          state?.configured === true
            ? 'credential.configured'
            : 'credential.notConfigured',
        ),
      }),
    ),
    e(TextInput, {
      type: 'password',
      value,
      disabled,
      placeholderKey: 'placeholder.keepKey',
      onChange,
    }),
  )
}
