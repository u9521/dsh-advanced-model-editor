import { filterCompatForProtocol } from './compat.ts'
import { MODALITIES, PROFILE_FIELDS } from './constants.ts'
import type {
  CompatProfile,
  DiscoveredModel,
  EditorState,
  Modality,
  ModelProfile,
  ProviderProfile,
  SettingsNamespaceView,
} from './types.ts'
import { at, clone, isObject, owns } from './utils.ts'

/**
 * The disclosed input types we can actually store, in wire order. An endpoint
 * may echo anything; narrowing here keeps a malformed value out of the draft.
 * @param candidate - one discovered model.
 * @returns the recognized modalities, empty when none were disclosed.
 */
export function disclosedModalities(candidate: DiscoveredModel): Modality[] {
  return Array.isArray(candidate.inputModalities)
    ? candidate.inputModalities.filter((item): item is Modality =>
        (MODALITIES as string[]).includes(item),
      )
    : []
}

/**
 * Project one discovered candidate onto the model shape a pi-ai route stores.
 * `description` is deliberately dropped: it exists only in the official
 * catalog's model entry, not in `PiAiModelProfile`.
 * @param candidate - one discovered model.
 * @returns the profile fields the discovered facts can fill.
 */
export function discoveredModelProfile(
  candidate: DiscoveredModel,
): ModelProfile {
  const modalities = disclosedModalities(candidate)
  return {
    ...(candidate.id ? { id: candidate.id } : {}),
    ...(candidate.name ? { name: candidate.name } : {}),
    ...(typeof candidate.contextWindow === 'number'
      ? { contextWindow: candidate.contextWindow }
      : {}),
    ...(typeof candidate.maxTokens === 'number'
      ? { maxTokens: candidate.maxTokens }
      : {}),
    ...(modalities.length > 0 ? { input: modalities } : {}),
  }
}

export function initialEditorState(
  namespace: SettingsNamespaceView | undefined,
  path: string[],
): EditorState {
  const profile = clone<ProviderProfile>(
    (at(namespace?.value, path) || {}) as ProviderProfile,
  )
  const user = at(namespace?.user, path) || {}
  return {
    profile,
    explicit: Object.fromEntries(
      PROFILE_FIELDS.map((field) => [field, owns(user, field)]),
    ),
  }
}

export function hasUserProfile(
  namespace: SettingsNamespaceView | undefined,
  path: string[],
): boolean {
  return isObject(at(namespace?.user, path))
}

export function filterCompatByProtocol(
  compat: CompatProfile | undefined,
  api: string | undefined,
): CompatProfile | undefined {
  // One rule lives in ./compat.ts: an unknown protocol falls back to the same
  // set the editor renders, instead of dropping every key as it used to.
  return filterCompatForProtocol(compat, api)
}

/**
 * Filter model-level and route-level `compat` to only retain fields supported
 * by the route's drafted protocol. When `api` is undefined, keep `compat`
 * untouched.
 * @param profile - the profile about to be saved.
 * @param api - the route's protocol as currently drafted.
 * @returns a profile with every `compat` entry filtered to valid fields for `api`.
 */
export function stripModelCompat(
  profile: ProviderProfile,
  api: string | undefined,
): ProviderProfile {
  if (api === undefined) return profile
  const next = clone(profile)
  if (owns(next, 'compat')) {
    const cleaned = filterCompatByProtocol(next.compat, api)
    if (cleaned === undefined) delete next.compat
    else next.compat = cleaned
  }
  if (Array.isArray(next.models))
    next.models = next.models.map((model) => {
      const entry = { ...model }
      const cleaned = filterCompatByProtocol(entry.compat, api)
      if (cleaned === undefined) delete entry.compat
      else entry.compat = cleaned
      return entry
    })
  if (isObject(next.modelOverrides)) {
    const overrides: Record<string, ModelProfile> = {}
    for (const [id, model] of Object.entries(next.modelOverrides)) {
      const entry = { ...(model as ModelProfile) }
      const cleaned = filterCompatByProtocol(entry.compat, api)
      if (cleaned === undefined) delete entry.compat
      else entry.compat = cleaned
      overrides[id] = entry
    }
    next.modelOverrides = overrides
  }
  return next
}
