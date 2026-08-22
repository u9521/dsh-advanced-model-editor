export * from './zh.ts'
export * from './en.ts'

export function flattenDictionary(
  source: Record<string, unknown>,
  prefix = '',
  result: Record<string, string> = {},
): Record<string, string> {
  for (const [key, value] of Object.entries(source)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object' && !Array.isArray(value))
      flattenDictionary(value as Record<string, unknown>, path, result)
    else result[path] = String(value)
  }
  return result
}
