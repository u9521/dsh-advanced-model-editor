import { tr } from './i18n.ts'
import type { CredentialInfo, LlmNativeAuth } from './types.ts'

/** Redacted credential state per reference, as the page and the field hold it. */
export type CredentialChecks = Readonly<Record<string, CredentialInfo>>

/**
 * Describe the credential posture of one route.
 *
 * DSH 0.2.1 exposes the authentication a route performs without any profile
 * credential (`nativeAuth`), so a keyless route must not read as "missing a
 * key": its environment references and OAuth availability are the real answer.
 * This lives outside the control that renders it because the policy is the part
 * with branches worth testing, and a control file cannot be imported without a
 * React runtime.
 * @param nativeAuth - the route's native authentication, when it declares one.
 * @param checks - redacted state per environment reference.
 * @param hasNamedRef - whether the profile names an `apiKeyEnv` itself.
 * @param namedRef - the reference the profile names, or the derived default.
 * @returns the status text shown beside the key input.
 */
export function credentialStatus(
  nativeAuth: LlmNativeAuth | undefined,
  checks: CredentialChecks | undefined,
  hasNamedRef: boolean,
  namedRef: string,
): string {
  if (hasNamedRef || nativeAuth === undefined) {
    const configured = checks?.[namedRef]?.configured === true
    return configured
      ? tr('credential.configured')
      : tr('credential.notConfigured')
  }
  const present = nativeAuth.env.filter(
    (name) => checks?.[name]?.configured === true,
  )
  if (present.length > 0)
    return tr('credential.nativeConfigured', { refs: present.join(', ') })
  if (nativeAuth.oauth) return tr('credential.nativeOAuth')
  if (nativeAuth.env.length === 0) return tr('credential.nativeNone')
  return tr('credential.nativeMissing', { refs: nativeAuth.env.join(', ') })
}

/**
 * Merge the page's batched checks with one field's own single-reference read.
 * The field wins for its own reference: it read that value most recently.
 * @param checks - checks the page batched.
 * @param keyRef - the reference this field asked about.
 * @param own - the field's own read, when it has one.
 * @returns the merged map.
 */
export function mergeCredentialChecks(
  checks: CredentialChecks | undefined,
  keyRef: string,
  own: CredentialInfo | undefined,
): Record<string, CredentialInfo> {
  const merged: Record<string, CredentialInfo> = { ...(checks ?? {}) }
  if (own !== undefined) merged[keyRef] = own
  return merged
}
