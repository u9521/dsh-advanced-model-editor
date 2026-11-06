import type { SettingsNamespaceView, SettingsPathOp } from './types.ts'
import { equal, isObject, owns } from './utils.ts'

/**
 * How the official DeepSeek route relates to its service model listing.
 *
 * The adapter follows `GET https://api.deepseek.com/models` only while two
 * conditions hold: the route points at the official origin, and `models` is
 * still the built-in catalog. Editing the list replaces the catalog and stops
 * the listing; removing the list restores it. This module names that state so
 * the editor can say which one the user is looking at instead of silently
 * toggling the behaviour on save.
 */
export type ListingFollow =
  /** `models` is absent or equal to the built-in catalog. */
  | 'following'
  /** `models` differs from the built-in catalog, so the route serves it instead. */
  | 'customized'
  /** The route is not on the official origin, so no listing is requested either way. */
  | 'not-applicable'

/** The official origin `/models` is requested from. */
export const OFFICIAL_ORIGIN = 'https://api.deepseek.com'

/**
 * Whether one endpoint string addresses the official origin.
 *
 * The adapter compares the Messages origin, and an unset `baseURL` falls back
 * to `$DEEPSEEK_BASE_URL` and then the public API. The environment layer is
 * invisible from the browser, so an unset field is read as the official
 * default — the same assumption the adapter starts from on a stock install.
 * @param baseURL - the route's drafted `baseURL`, when it sets one.
 * @returns whether the route is expected to use the official origin.
 */
export function onOfficialOrigin(baseURL: unknown): boolean {
  if (typeof baseURL !== 'string' || baseURL.trim().length === 0) return true
  try {
    return new URL(baseURL.trim()).origin === OFFICIAL_ORIGIN
  } catch {
    return false
  }
}

/**
 * Classify the official route's catalog against the schema's built-in default.
 *
 * The comparison is structural and order-sensitive, the same way the adapter's
 * own `isBuiltInCatalog` compares the resolved catalog with the built-in one.
 * The adapter normalizes before comparing (it fills `inputModalities`), while
 * this reader compares the stored JSON; that makes the page marginally
 * stricter — a hand-written list spelling out the defaults reads as customized
 * — which is the safe direction: the page never claims the listing is off when
 * it is on, only the reverse, and the "Restore defaults" action clears it.
 * @param user - the namespace's raw user layer.
 * @param builtIn - the schema default for the route's `models` field.
 * @returns the listing relationship the editor describes.
 */
export function listingFollow(user: unknown, builtIn: unknown): ListingFollow {
  const stored = isObject(user) ? (user as Record<string, unknown>) : {}
  if (!owns(stored, 'models')) return 'following'
  if (builtIn === undefined) return 'customized'
  return equal(stored.models, builtIn) ? 'following' : 'customized'
}

/**
 * Classify one route and its endpoint together.
 * @param view - the official namespace view.
 * @param baseURL - the drafted `baseURL`.
 * @param builtIn - the schema default for `models`.
 * @returns the listing relationship, endpoint condition included.
 */
export function listingStateFor(
  view: SettingsNamespaceView | undefined,
  baseURL: unknown,
  builtIn: unknown,
): ListingFollow {
  if (!onOfficialOrigin(baseURL)) return 'not-applicable'
  return listingFollow(view?.user, builtIn)
}

/**
 * The write that returns a customized route to the listing.
 *
 * Removing `models` from the user layer lets the schema default resolve again,
 * which is what the adapter reads as "not customized" and what makes the next
 * access request the listing even while a cached answer is still fresh.
 * @param path - the profile's path inside the namespace user layer.
 * @returns one ordered path operation.
 */
export function restoreDefaultOps(path: readonly string[]): SettingsPathOp[] {
  return [{ op: 'unset', path: [...path, 'models'] }]
}
