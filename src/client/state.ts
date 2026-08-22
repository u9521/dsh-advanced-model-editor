import {
  PROFILE_FIELDS,
  PROTOCOL_COMPAT_FIELDS,
  SETTINGS_NS,
} from './constants.ts'
import type {
  CompatProfile,
  EditorState,
  ModelProfile,
  ProviderProfile,
  ProviderRow,
  SettingsNamespaceView,
  SettingsPathOp,
} from './types.ts'
import { at, clone, equal, isObject, owns, tr } from './utils.ts'

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

export function buildProfileOps(
  path: string[],
  initial: EditorState,
  draft: ProviderProfile,
  explicit: Record<string, boolean>,
): SettingsPathOp[] {
  return PROFILE_FIELDS.flatMap((field): SettingsPathOp[] => {
    if (initial.explicit[field] && !explicit[field])
      return [{ op: 'unset', path: [...path, field] }]
    if (
      explicit[field] &&
      (!initial.explicit[field] || !equal(initial.profile[field], draft[field]))
    )
      return [
        {
          op: 'set',
          path: [...path, field],
          value: clone(draft[field]),
        },
      ]
    return []
  })
}

export function groupProviderRows(
  rows: ProviderRow[],
  namespace: SettingsNamespaceView,
): { builtIn: ProviderRow[]; custom: ProviderRow[] } {
  const builtIn: ProviderRow[] = []
  const custom: ProviderRow[] = []
  for (const row of rows) {
    if (
      row.settingsNs !== SETTINGS_NS ||
      !hasUserProfile(namespace, row.settingsPath)
    )
      continue
    const target = row.declared === true ? custom : builtIn
    target.push({
      ...row,
      configured: clone<ProviderProfile>(
        (at(namespace?.value, row.settingsPath) || {}) as ProviderProfile,
      ),
    })
  }
  return { builtIn, custom }
}

export function deleteProviderOps(row: ProviderRow): SettingsPathOp[] {
  if (
    row.userAdded !== true ||
    row.settingsNs !== SETTINGS_NS ||
    row.settingsPath.length !== 2 ||
    row.settingsPath[0] !== 'providers'
  ) {
    throw new Error(tr('validation.deleteOnlyUserAdded'))
  }
  return [{ op: 'unset', path: [...row.settingsPath] }]
}

export function filterCompatByProtocol(
  compat: CompatProfile | undefined,
  api: string | undefined,
): CompatProfile | undefined {
  if (!isObject(compat) || api === undefined) return compat
  const allowed = PROTOCOL_COMPAT_FIELDS[api]
  if (!allowed) return undefined
  const filtered: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(compat)) {
    if (
      allowed.includes(key) &&
      value !== undefined &&
      value !== null &&
      value !== ''
    ) {
      if (
        typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.keys(value).length === 0
      )
        continue
      filtered[key] = value
    }
  }
  return Object.keys(filtered).length === 0
    ? undefined
    : (filtered as CompatProfile)
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
  if (api === 'openai-completions' || api === undefined) return profile
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
