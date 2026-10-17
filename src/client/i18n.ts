import type { Translator } from './types.ts'

/**
 * The one translator every rendered string passes through.
 *
 * This module exists so that `settings.ts` can translate without importing
 * `utils.ts`: `utils.ts` needs `choices.ts` for the seeded reasoning efforts,
 * `choices.ts` needs `settings.ts` for the schema reads, and `settings.ts` needed
 * `tr` — a three-module import cycle. Translation is the only thing
 * `settings.ts` wanted from that grab-bag, so it gets its own leaf module and
 * the cycle becomes a chain: i18n ← utils ← choices ← settings.
 */

let translate: Translator = (key) => key

/**
 * Install the dictionary the plugin's locale binding resolves against.
 * @param next - translator for the registered locale namespace; a non-function
 *   replaces the current one with the identity translator.
 */
export function setTranslator(next: Translator): void {
  translate = typeof next === 'function' ? next : (key) => key
}

/**
 * Translate one dictionary key, interpolating `{name}` placeholders.
 * @param key - dictionary path; returned verbatim when the dictionary misses it.
 * @param vars - values substituted for `{name}` occurrences.
 * @returns the localized text.
 */
export function tr(
  key: string,
  vars?: Record<string, string | number>,
): string {
  let value = translate(key)
  if (typeof value !== 'string') value = key
  if (vars)
    for (const [name, replacement] of Object.entries(vars))
      value = value.replaceAll(`{${name}}`, String(replacement))
  return value
}
