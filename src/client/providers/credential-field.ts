import * as React from 'react'
import type { CredentialChecks } from '../credential-status.ts'
import {
  credentialStatus,
  mergeCredentialChecks,
} from '../credential-status.ts'
import { TextInput } from '../controls/index.ts'
import { tr } from '../i18n.ts'
import type { CredentialInfo, LlmNativeAuth, ModelApi } from '../types.ts'

export interface CredentialFieldProps {
  api: ModelApi
  keyRef: string
  revision: number
  value: string
  onChange: (value: string | number | undefined) => void
  disabled?: boolean
  /** Provider-native authentication the route performs without a credential reference. */
  nativeAuth?: LlmNativeAuth
  /** Redacted state per native-auth reference. */
  credentialChecks?: CredentialChecks
  /** Whether the profile names its own `apiKeyEnv` reference. */
  hasNamedRef?: boolean
}

const e = React.createElement

/**
 * The write-only key input, with the route's credential posture beside it.
 *
 * The posture itself is `../credential-status.ts`: a policy with branches that
 * are worth testing and that a test can reach only from a module without a
 * React runtime.
 */
export function CredentialField({
  api,
  keyRef,
  revision,
  value,
  onChange,
  disabled,
  nativeAuth,
  credentialChecks,
  hasNamedRef,
}: CredentialFieldProps) {
  const [state, setState] = React.useState<CredentialInfo>()
  React.useEffect(() => {
    let active = true
    api.credentials.describe([keyRef]).then(
      (response) => {
        if (active && response.result.ok)
          setState(
            (
              response.result.value as Record<
                string,
                CredentialInfo | undefined
              >
            )?.[keyRef],
          )
      },
      () => undefined,
    )
    return () => {
      active = false
    }
  }, [api, keyRef, revision])
  const checks = React.useMemo(
    () => mergeCredentialChecks(credentialChecks, keyRef, state),
    [credentialChecks, keyRef, state],
  )
  const status = credentialStatus(
    nativeAuth,
    checks,
    hasNamedRef === true,
    keyRef,
  )
  return e(
    'label',
    { className: 'dsh-ma-field' },
    e(
      'span',
      { className: 'dsh-ma-field-label' },
      tr('credential.label', { status }),
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
