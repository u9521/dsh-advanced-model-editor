import {
  OFFICIAL_FIELDS,
  PROFILE_FIELDS,
  PROTOCOLS,
  THINKING_LEVELS,
} from './constants.ts'
import { dictKeys, objectFields, unionValues } from './settings.ts'
import type { SettingsServices } from './settings.ts'
import type { ReasoningEfforts, SettingsNamespaceView } from './types.ts'

/**
 * Live option and field sets derived from a namespace's own serialized schema.
 *
 * DSH 0.2.1 made the schema the single source for the choices a settings
 * surface offers: the official Models page reads the protocol union and the
 * reasoning-level key union out of `settings.describe` rather than keeping a
 * copy (see `protocolChoices` / `reasoningLevelChoices` there). This module
 * follows the same rule for the standalone page. The compiled-in constants
 * stay as the fallback for the moment before the first describe answer lands,
 * and as the documented field set the tests assert against.
 */

/** The route path used to reach one provider profile's schema node. */
const PROBE_ROUTE = '\u0000probe'

let protocols: readonly string[] = PROTOCOLS
let reasoningLevels: readonly string[] = THINKING_LEVELS
let profileFields: readonly string[] = PROFILE_FIELDS
let officialFields: readonly string[] = OFFICIAL_FIELDS

/** Wire protocols the route schema accepts, in declaration order. */
export function protocolChoices(): readonly string[] {
  return protocols
}

/** Reasoning levels the model schema accepts as `reasoningEfforts` keys. */
export function reasoningLevelChoices(): readonly string[] {
  return reasoningLevels
}

/** Fields the llm-pi-ai profile schema declares, in declaration order. */
export function profileFieldChoices(): readonly string[] {
  return profileFields
}

/** Fields the llm-deepseek section schema declares, in declaration order. */
export function officialFieldChoices(): readonly string[] {
  return officialFields
}

/**
 * Replace every derived set from the two namespace views. Called on each
 * describe update; an empty derivation keeps the previous set rather than
 * blanking the controls while a namespace is momentarily unreadable.
 * @param schema - settings schema service.
 * @param namespaces - the served namespace views by id.
 */
export function adoptSchemaChoices(
  schema: SettingsServices['settingsSchema'],
  namespaces: {
    llmPiAi?: SettingsNamespaceView
    llmDeepSeek?: SettingsNamespaceView
  },
): void {
  const pi = namespaces.llmPiAi
  const nextProtocols = unionValues(schema, pi, [
    'providers',
    PROBE_ROUTE,
    'api',
  ])
  if (nextProtocols.length > 0) protocols = nextProtocols
  const nextLevels = dictKeys(schema, pi, [
    'providers',
    PROBE_ROUTE,
    'models',
    '0',
    'reasoningEfforts',
  ])
  if (nextLevels.length > 0) reasoningLevels = nextLevels
  const nextProfile = objectFields(schema, pi, ['providers', PROBE_ROUTE])
  if (nextProfile.length > 0) profileFields = nextProfile
  const nextOfficial = objectFields(schema, namespaces.llmDeepSeek, [])
  if (nextOfficial.length > 0) officialFields = nextOfficial
}

/**
 * Seed a custom `reasoningEfforts` map with the levels the adapter currently
 * accepts, using each level's own wire spelling. Levels come from the
 * namespace schema, so a level the adapter drops stops being offered.
 *
 * This lives beside the level list it reads rather than in `utils.ts`, which is
 * what used to make `utils -> choices -> settings -> utils` a cycle.
 * @returns a fresh effort map keyed in escalation order.
 */
export function createDefaultReasoningEfforts(): ReasoningEfforts {
  const result: ReasoningEfforts = {}
  for (const level of reasoningLevelChoices()) {
    result[level] = level === 'off' ? null : level
  }
  return result
}

/** Restore the compiled-in fallbacks (tests and teardown). */
export function resetSchemaChoices(): void {
  protocols = PROTOCOLS
  reasoningLevels = THINKING_LEVELS
  profileFields = PROFILE_FIELDS
  officialFields = OFFICIAL_FIELDS
}
