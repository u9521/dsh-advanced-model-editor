import {
  CACHE_CONTROL_FORMATS,
  MAX_TOKENS_FIELDS,
  THINKING_FORMATS,
  THINKING_TOKEN_BUDGET_FIELDS,
} from './constants.ts'
import type { CompatProfile } from './types.ts'

/**
 * One entry of the route compatibility table.
 *
 * Before this module the same field set was declared three times: an allow-list
 * per protocol, nineteen hand-written JSX blocks, and a hard-coded boolean list
 * inside the validator. They happened to agree; nothing kept them agreeing, and
 * two allow-listed keys had no control at all. The table makes the field set one
 * declaration that the editor, the validator and the protocol filter all read.
 */
export interface CompatField {
  /** Key as the route's `compat` dict spells it. */
  key: string
  /**
   * Which control the editor renders: a tri-state switch, a string enum, an
   * integer, or a free-form JSON object (`chatTemplate*`).
   */
  kind: 'boolean' | 'enum' | 'integer' | 'json'
  /** Accepted values for `kind: 'enum'`, in declaration order. */
  choices?: readonly string[]
  /** Control width hint; wide fields take the whole row. */
  wide?: boolean
}

/**
 * Every compat field the pi-ai adapter offers, in the schema's declaration
 * order. `COMPAT_PROTOCOL_FIELDS` below names which protocol offers which.
 */
export const COMPAT_FIELDS: readonly CompatField[] = [
  { key: 'supportsStore', kind: 'boolean' },
  { key: 'supportsDeveloperRole', kind: 'boolean' },
  { key: 'supportsReasoningEffort', kind: 'boolean' },
  { key: 'supportsUsageInStreaming', kind: 'boolean' },
  { key: 'supportsFinishReason', kind: 'boolean' },
  { key: 'maxTokensField', kind: 'enum', choices: MAX_TOKENS_FIELDS },
  { key: 'requiresToolResultName', kind: 'boolean' },
  { key: 'requiresAssistantAfterToolResult', kind: 'boolean' },
  { key: 'requiresThinkingAsText', kind: 'boolean' },
  { key: 'requiresReasoningContentOnAssistantMessages', kind: 'boolean' },
  { key: 'thinkingFormat', kind: 'enum', choices: THINKING_FORMATS },
  { key: 'chatTemplateKwargs', kind: 'json', wide: true },
  { key: 'chatTemplateArgs', kind: 'json', wide: true },
  { key: 'supportsThinkingTokenBudget', kind: 'boolean' },
  {
    key: 'thinkingTokenBudgetField',
    kind: 'enum',
    choices: THINKING_TOKEN_BUDGET_FIELDS,
  },
  { key: 'vllmPriority', kind: 'integer' },
  { key: 'supportsMaxOutputTokens', kind: 'boolean' },
  { key: 'supportsStrictMode', kind: 'boolean' },
  {
    key: 'cacheControlFormat',
    kind: 'enum',
    choices: CACHE_CONTROL_FORMATS,
  },
  { key: 'supportsLongCacheRetention', kind: 'boolean' },
  { key: 'supportsEagerToolInputStreaming', kind: 'boolean' },
  { key: 'supportsCacheControlOnTools', kind: 'boolean' },
  { key: 'supportsTemperature', kind: 'boolean' },
  { key: 'forceAdaptiveThinking', kind: 'boolean' },
  { key: 'allowEmptySignature', kind: 'boolean' },
  { key: 'supportsStrictTools', kind: 'boolean' },
]

/** Compat keys each wire protocol accepts, in declaration order. */
export const COMPAT_PROTOCOL_FIELDS: Record<string, readonly string[]> = {
  'openai-completions': [
    'thinkingFormat',
    'supportsReasoningEffort',
    'supportsDeveloperRole',
    'supportsStore',
    'supportsUsageInStreaming',
    'supportsFinishReason',
    'maxTokensField',
    'requiresToolResultName',
    'requiresAssistantAfterToolResult',
    'requiresThinkingAsText',
    'requiresReasoningContentOnAssistantMessages',
    'chatTemplateKwargs',
    'chatTemplateArgs',
    'supportsThinkingTokenBudget',
    'thinkingTokenBudgetField',
    'vllmPriority',
    'supportsStrictMode',
    'cacheControlFormat',
    'supportsLongCacheRetention',
  ],
  'openai-responses': [
    'supportsDeveloperRole',
    'supportsMaxOutputTokens',
    'supportsStrictMode',
    'supportsLongCacheRetention',
  ],
  'anthropic-messages': [
    'supportsTemperature',
    'forceAdaptiveThinking',
    'supportsEagerToolInputStreaming',
    'supportsCacheControlOnTools',
    'allowEmptySignature',
    'supportsStrictTools',
    'supportsLongCacheRetention',
  ],
}

/** The protocol used when a route names none, matching the adapter's default. */
export const DEFAULT_PROTOCOL = 'openai-completions'

/**
 * The compat fields one route's protocol offers, in table order.
 * @param api - the route's wire protocol; an unset or unknown protocol takes
 *   the same set the editor and the adapter default to.
 * @returns the offered fields; empty when the protocol declares no compat type.
 */
export function compatFields(api: string | undefined): CompatField[] {
  const allowed =
    COMPAT_PROTOCOL_FIELDS[api ?? DEFAULT_PROTOCOL] ??
    COMPAT_PROTOCOL_FIELDS[DEFAULT_PROTOCOL]
  return COMPAT_FIELDS.filter((field) => allowed.includes(field.key))
}

/**
 * Report whether a compat entry carries a value at all. An absent key, an empty
 * string, and an empty object all mean "not configured": schemastery materializes
 * an absent dict as `{}`, so an empty one states nothing.
 * @param value - one compat entry's value.
 * @returns whether the entry should be treated as configured.
 */
export function compatValueConfigured(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return false
  if (
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length === 0
  )
    return false
  return true
}

/**
 * Reduce one compat dict to the keys the route's protocol accepts, dropping
 * entries that state nothing. The editor, the page and the save path all use
 * this so a protocol switch cannot leave a key behind that will be rejected.
 * @param compat - the drafted compat dict.
 * @param api - the route's wire protocol as currently drafted.
 * @returns the accepted entries, or undefined when none survive.
 */
export function filterCompatForProtocol(
  compat: CompatProfile | undefined,
  api: string | undefined,
): CompatProfile | undefined {
  if (compat === undefined) return undefined
  const allowed = new Set(compatFields(api).map((field) => field.key))
  const filtered: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(compat)) {
    if (allowed.has(key) && compatValueConfigured(value)) filtered[key] = value
  }
  return Object.keys(filtered).length === 0
    ? undefined
    : (filtered as CompatProfile)
}
