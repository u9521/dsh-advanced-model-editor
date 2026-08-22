import { THINKING_LEVELS } from './constants.ts'
import type {
  ProviderProfile,
  ReasoningEfforts,
  RpcEnvelope,
  Translator,
} from './types.ts'

export function createDefaultReasoningEfforts(): ReasoningEfforts {
  const result: ReasoningEfforts = {}
  for (const level of THINKING_LEVELS) {
    result[level] = level === 'off' ? null : level
  }
  return result
}

/** Accepted capacity spellings: a decimal count with an optional unit suffix. */
const CAPACITY_PATTERN =
  /^(\d+(?:\.\d+)?)\s*([kmgtb]|kib|mib|gib|tib|kb|mb|gb|tb|ki|mi|gi|ti)?$/i

const DECIMAL_SCALES: Record<string, number> = {
  k: 1_000,
  kb: 1_000,
  m: 1_000_000,
  mb: 1_000_000,
  g: 1_000_000_000,
  gb: 1_000_000_000,
  b: 1_000_000_000,
  t: 1_000_000_000_000,
  tb: 1_000_000_000_000,
}

const BINARY_SCALES: Record<string, number> = {
  ki: 1024,
  kib: 1024,
  mi: 1024 * 1024,
  mib: 1024 * 1024,
  gi: 1024 * 1024 * 1024,
  gib: 1024 * 1024 * 1024,
  ti: 1024 * 1024 * 1024 * 1024,
  tib: 1024 * 1024 * 1024 * 1024,
}

/**
 * Read a typed capacity, so a user can write `256K`, `1M`, `128MiB`, `20MB` etc.
 * instead of counting zeroes. The stored value stays a plain number.
 * @param text - raw field text.
 * @returns the count; `undefined` when blank (inherit), `NaN` when unreadable
 *   (rejected by validation before any write).
 */
export function parseCapacity(text: string): number | undefined {
  const trimmed = text.trim()
  if (trimmed.length === 0) return undefined
  const match = CAPACITY_PATTERN.exec(trimmed)
  if (match === null) return Number.NaN
  const suffix = match[2]?.toLowerCase()
  let scale = 1
  if (suffix) {
    if (suffix in BINARY_SCALES) scale = BINARY_SCALES[suffix]
    else if (suffix in DECIMAL_SCALES) scale = DECIMAL_SCALES[suffix]
  }
  const scaled = Number(match[1]) * scale
  // A decimal multiple is exact in intent but not in binary floating point
  // (2.3 * 1e6 lands a few ULPs high), so an integral intent snaps back.
  const rounded = Math.round(scaled)
  return Math.abs(scaled - rounded) < 1e-6 ? rounded : scaled
}

/**
 * Spell a stored count back in the shortest form that survives a round trip
 * through {@link parseCapacity}; a count that is not a whole number of
 * units stays written out.
 * @param value - stored capacity.
 * @returns the field text.
 */
export function formatCapacity(value: number): string {
  if (!Number.isInteger(value) || value <= 0) return String(value)
  if (value % 1_000_000_000_000 === 0)
    return `${String(value / 1_000_000_000_000)}T`
  if (value % 1_000_000_000 === 0) return `${String(value / 1_000_000_000)}G`
  if (value % 1_000_000 === 0) return `${String(value / 1_000_000)}M`
  if (value % 1_000 === 0) return `${String(value / 1_000)}K`
  if (value % (1024 * 1024 * 1024 * 1024) === 0)
    return `${String(value / (1024 * 1024 * 1024 * 1024))}Ti`
  if (value % (1024 * 1024 * 1024) === 0)
    return `${String(value / (1024 * 1024 * 1024))}Gi`
  if (value % (1024 * 1024) === 0) return `${String(value / (1024 * 1024))}Mi`
  if (value % 1024 === 0) return `${String(value / 1024)}Ki`
  return String(value)
}

let translate: Translator = (key) => key

export function setTranslator(next: Translator): void {
  translate = typeof next === 'function' ? next : (key) => key
}

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

export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function owns(value: unknown, key: string): boolean {
  return isObject(value) && Object.prototype.hasOwnProperty.call(value, key)
}

export function clone<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => clone(item)) as T
  if (isObject(value))
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, clone(item)]),
    ) as T
  return value
}

export function equal(left: unknown, right: unknown): boolean {
  if (left === right) return true
  if (Array.isArray(left) || Array.isArray(right))
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((item, index) => equal(item, right[index]))
    )
  if (!isObject(left) || !isObject(right)) return false
  const keys = Object.keys(left)
  return (
    keys.length === Object.keys(right).length &&
    keys.every((key) => owns(right, key) && equal(left[key], right[key]))
  )
}

export function at(source: unknown, path: string[]): unknown {
  let current: unknown = source
  for (const part of path) {
    if (!isObject(current) || !owns(current, part)) return undefined
    current = current[part]
  }
  return current
}

export function setIn(
  source: ProviderProfile,
  field: string,
  value: unknown,
): ProviderProfile {
  const next = clone(source)
  if (value === undefined) delete next[field]
  else next[field] = clone(value)
  return next
}

export function valueOf<T = unknown>(response: RpcEnvelope): T {
  if (!response.result.ok) throw new Error(response.result.error.message)
  return response.result.value as T
}

export function responseMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function deriveKeyRef(provider: string): string {
  return `${provider.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_API_KEY`
}
