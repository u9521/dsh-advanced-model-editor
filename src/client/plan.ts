import { PROFILE_FIELDS } from './constants.ts'
import type { CredentialWrite } from './commit.ts'
import { diffProfile } from './commit.ts'
import { stripModelCompat } from './state.ts'
import type {
  EditorState,
  ProviderProfile,
  ProviderRow,
  SettingsPathOp,
} from './types.ts'
import { equal, owns } from './utils.ts'

/** What one Apply click will do, resolved before any input is validated. */
export interface SavePlan {
  /** Ordered operations the commit writes. */
  ops: SettingsPathOp[]
  /** The profile those operations describe, for validation. */
  profile: ProviderProfile
  /** The key to store after the profile lands, when the user typed one. */
  credential?: CredentialWrite
}

/** Everything a save plan is derived from. */
export interface SavePlanInput {
  /** The provider row being edited. */
  row: ProviderRow
  /** The drafted profile. */
  draft: ProviderProfile
  /** The profile as loaded, plus which fields the user layer owned. */
  baseline: EditorState
  /** Which fields the user has touched in this session. */
  explicit: Record<string, boolean>
  /** The credential text as typed, trimmed. */
  keyValue: string
  /** The reference that key stores under. */
  keyRef: string
  /** The fields the route's schema offers, in declaration order. */
  chosen: readonly string[]
}

/**
 * Turn one drafted profile into the batch a commit writes, the profile a
 * validator judges, and the credential step that follows.
 *
 * This is the module the old save path was missing: it built `ops` from one
 * projection and handed a second projection to the validator, so a field could
 * pass validation and never be written (or the reverse). Both now come from the
 * same cleaned draft, and the two tests below assert they agree.
 * @param input - the draft, its baseline, and the credential the user typed.
 * @returns the ops, the profile they describe, and the optional credential.
 */
export function planSave(input: SavePlanInput): SavePlan {
  const cleaned = stripModelCompat(input.draft, input.draft.api)
  const ofRoute = new Set(input.chosen)
  const since = input.baseline.profile
  const wasExplicit = input.baseline.explicit
  const ops: SettingsPathOp[] = []

  for (const field of PROFILE_FIELDS) {
    // A field the route's schema does not offer is not this route's to write.
    if (!ofRoute.has(field) && field !== 'apiKeyEnv') continue
    const value = cleaned[field]
    const present = input.explicit[field] === true
    if (wasExplicit[field] === true && !present) {
      ops.push({ op: 'unset', path: [...input.row.settingsPath, field] })
      continue
    }
    if (value === undefined) continue
    if (!present) continue
    // Opening a card must not rewrite a value the user never touched; only an
    // actual difference becomes an op, which is what the Host's own page does.
    if (wasExplicit[field] === true && equal(since[field], value)) continue
    ops.push({
      op: 'set',
      path: [...input.row.settingsPath, field],
      value,
    })
  }

  const namesApiKey = typeof cleaned.apiKeyEnv === 'string'
  const credential = input.keyValue
    ? { ref: input.keyRef, value: input.keyValue }
    : undefined
  if (credential !== undefined && !namesApiKey)
    ops.push({
      op: 'set',
      path: [...input.row.settingsPath, 'apiKeyEnv'],
      value: input.keyRef,
    })

  const profile = Object.fromEntries(
    input.chosen
      .filter(
        (name) =>
          (name === 'api' &&
            (input.row.declared === true ||
              input.explicit.api === true ||
              cleaned.api !== undefined)) ||
          (name === 'apiKeyEnv'
            ? namesApiKey || credential !== undefined
            : input.explicit[name] === true),
      )
      .map((name) => [
        name,
        name === 'apiKeyEnv' && !namesApiKey ? input.keyRef : cleaned[name],
      ]),
  ) as ProviderProfile

  return {
    ops,
    profile,
    ...(credential === undefined ? {} : { credential }),
  }
}

/**
 * Diff a profile against its baseline without the explicit-tracking layer.
 * The official editor has no override checkboxes: every field is always the
 * user's, so presence alone decides.
 * @param path - path of the profile inside the namespace's user layer.
 * @param baseline - the user layer as loaded.
 * @param draft - the drafted profile.
 * @returns ordered operations; empty when nothing changed.
 */
export function planReplace(
  path: readonly string[],
  baseline: unknown,
  draft: ProviderProfile,
): SettingsPathOp[] {
  return diffProfile(path, baseline, draft)
}

/**
 * Whether a profile names its own credential reference.
 * @param profile - the drafted profile.
 * @returns whether `apiKeyEnv` is a non-empty string.
 */
export function namesCredentialRef(profile: ProviderProfile): boolean {
  return owns(profile, 'apiKeyEnv') && typeof profile.apiKeyEnv === 'string'
}
