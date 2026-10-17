import { tr } from './i18n.ts'
import type { ConfigForm } from './settings.ts'
import { writeOps } from './settings.ts'
import type {
  ModelApi,
  ProviderProfile,
  SettingsPathOp,
  SettingsNamespaceView,
} from './types.ts'
import { clone, equal, owns, responseMessage } from './utils.ts'

/**
 * What a commit produced, as the caller has to show it.
 *
 * Before this module each editor re-derived the same four facts from a boolean,
 * a thrown error and a bare message function, so every call site re-implemented
 * the ordering rule "profile first, credential second, reload last" and got it
 * subtly different.
 */
export type CommitOutcome =
  /** Everything landed and the page has been reloaded. */
  | { kind: 'written' }
  /** The Host refused the settings write; the shared mirror already reloaded. */
  | { kind: 'conflict' }
  /** The settings write landed but the credential write did not. */
  | { kind: 'credential-failed'; message: string }
  /** The settings write did not reach the Host at all. */
  | { kind: 'failed'; message: string }

/** One optional credential write paired with the commit. */
export interface CredentialWrite {
  /** Environment-variable reference the key stores under. */
  ref: string
  /** The plaintext key as typed, never the stored value. */
  value: string
}

/** Everything one commit needs, independent of the component that drives it. */
export interface CommitRequest {
  /** The namespace's shared write queue. */
  form: ConfigForm
  /** Ordered path operations carrying the drafted profile. */
  ops: readonly SettingsPathOp[]
  /** Write faces for the credential step. */
  api: ModelApi
  /** The key to store after the profile lands, when the user typed one. */
  credential?: CredentialWrite
  /** Re-read the page after the write settles. */
  reload: () => unknown
}

/**
 * Apply one draft: write the profile, then the credential, then reload.
 *
 * The order is the point. The profile write is the one the Host fences with a
 * revision and validates against the namespace schema, so a refusal there means
 * nothing else should happen; the credential write is a separate store that is
 * idempotent, so it goes second and its failure leaves a provider whose model
 * list is already saved and only the key outstanding. Doing it the other way
 * round used to leave a stored key on a profile the Host had refused.
 * @param request - the batch, its credential follow-up, and the reload.
 * @returns the outcome the caller renders.
 */
export async function commit(request: CommitRequest): Promise<CommitOutcome> {
  if (!(await writeOps(request.form, request.ops))) return { kind: 'conflict' }
  if (request.credential !== undefined) {
    try {
      const response = await request.api.credentials.set({
        ref: request.credential.ref,
        value: request.credential.value,
      })
      if (!response.result.ok)
        return {
          kind: 'credential-failed',
          message: response.result.error.message,
        }
    } catch (error) {
      return { kind: 'credential-failed', message: responseMessage(error) }
    }
  }
  try {
    await request.reload()
  } catch (error) {
    return { kind: 'failed', message: responseMessage(error) }
  }
  return { kind: 'written' }
}

/** Everything one delete needs. */
export interface DeleteRequest {
  /** The namespace's shared write queue. */
  form: ConfigForm
  /** Write faces for the credential step. */
  api: ModelApi
  /** Path of the profile inside the namespace's user layer. */
  path: readonly string[]
  /** Credential reference to clear, when the profile names one. */
  credentialRef?: string
  /** Re-read the page after the write settles. */
  reload: () => unknown
}

/**
 * Remove one provider profile and the credential it owns.
 *
 * The credential goes first, matching the Host's own page: both unsets are
 * idempotent, so a second-step failure leaves the row visible and the whole
 * delete safely retryable.
 * @param request - the path to clear, its credential, and the reload.
 * @returns the outcome the caller renders.
 */
export async function removeProfile(
  request: DeleteRequest,
): Promise<CommitOutcome> {
  if (request.credentialRef !== undefined) {
    try {
      const response = await request.api.credentials.unset({
        ref: request.credentialRef,
      })
      if (!response.result.ok)
        return { kind: 'failed', message: response.result.error.message }
    } catch (error) {
      return { kind: 'failed', message: responseMessage(error) }
    }
  }
  if (
    !(await writeOps(request.form, [{ op: 'unset', path: [...request.path] }]))
  )
    return { kind: 'conflict' }
  try {
    await request.reload()
  } catch (error) {
    return { kind: 'failed', message: responseMessage(error) }
  }
  return { kind: 'written' }
}

/**
 * The message a caller shows for one outcome, or undefined when it succeeded.
 * @param outcome - what {@link commit} or {@link removeProfile} returned.
 * @returns the localized failure text.
 */
export function outcomeMessage(outcome: CommitOutcome): string | undefined {
  if (outcome.kind === 'written') return undefined
  if (outcome.kind === 'conflict') return tr('validation.writeConflict')
  return outcome.message
}

/**
 * Project a draft onto the fields a route may write, so the object that is
 * validated is the object the ops were built from.
 *
 * The old save path rebuilt this projection separately from the ops, which is
 * how a profile could pass validation while the write carried a different set.
 * @param draft - the drafted profile.
 * @param keep - whether a field belongs in the write.
 * @returns the projected profile.
 */
export function projectProfile(
  draft: ProviderProfile,
  keep: (field: string) => boolean,
): ProviderProfile {
  return Object.fromEntries(
    Object.entries(draft).filter(([field]) => keep(field)),
  ) as ProviderProfile
}

/**
 * Diff one drafted subtree against the user layer it came from, naming only the
 * fields that differ. A field present in the draft but absent from the baseline
 * becomes a set; a field the baseline had and the draft dropped becomes an
 * unset. Fields absent from both produce no op.
 * @param path - path of the subtree inside the namespace's user layer.
 * @param baseline - the user layer as loaded.
 * @param draft - the subtree as edited.
 * @returns ordered path operations; empty when nothing changed.
 */
export function diffProfile(
  path: readonly string[],
  baseline: unknown,
  draft: ProviderProfile,
): SettingsPathOp[] {
  const previous = isRecord(baseline) ? baseline : {}
  const ops: SettingsPathOp[] = []
  for (const [field, value] of Object.entries(draft)) {
    if (value === undefined) continue
    if (!owns(previous, field) || !equal(previous[field], value))
      ops.push({ op: 'set', path: [...path, field], value: clone(value) })
  }
  for (const field of Object.keys(previous))
    if (!owns(draft, field) || draft[field] === undefined)
      ops.push({ op: 'unset', path: [...path, field] })
  return ops
}

/**
 * Narrow untrusted wire data to a plain object.
 * @param value - candidate value.
 * @returns whether it is a non-array object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * The profile a route will serve once inheritance resolves, for display.
 * @param namespace - the namespace view carrying the resolved value.
 * @param path - path of the profile inside the namespace.
 * @returns the resolved subtree, or an empty profile.
 */
export function resolvedProfile(
  namespace: SettingsNamespaceView | undefined,
  path: readonly string[],
): ProviderProfile {
  let current: unknown = namespace?.value
  for (const part of path) {
    if (!isRecord(current)) return {}
    current = current[part]
  }
  return isRecord(current) ? (current as ProviderProfile) : {}
}
