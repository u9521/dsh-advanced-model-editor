import {
  BUDGET_LEVELS,
  CACHE_CONTROL_FORMATS,
  CACHE_RETENTIONS,
  IMAGE_DETAILS,
  MAX_TIMER_DELAY_MS,
  MAX_TOKENS_FIELDS,
  MODALITIES,
  OFFICIAL_REASONING,
  OFFICIAL_THINKING,
  PROTOCOLS,
  THINKING_FORMATS,
  THINKING_LEVELS,
  TRANSPORTS,
} from './constants.ts'
import type {
  BudgetLevel,
  CacheRetention,
  Protocol,
  ThinkingLevel,
  Transport,
} from './types.ts'
import { isObject, owns, tr } from './utils.ts'

function numberError(
  value: unknown,
  key: string,
  errors: string[],
  min: number,
  max: number,
  integer: boolean,
): void {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isInteger(value))
  )
    errors.push(tr('validation.number', { field: tr(key) }))
}

export function validateCompat(
  value: unknown,
  path: string,
  errors: string[],
): void {
  if (!isObject(value)) {
    errors.push(tr('validation.object', { field: path }))
    return
  }
  if (
    owns(value, 'thinkingFormat') &&
    !THINKING_FORMATS.includes(String(value.thinkingFormat))
  )
    errors.push(tr('validation.invalid', { field: `${path}.thinkingFormat` }))
  if (
    owns(value, 'maxTokensField') &&
    !MAX_TOKENS_FIELDS.includes(String(value.maxTokensField))
  )
    errors.push(tr('validation.invalid', { field: `${path}.maxTokensField` }))
  if (
    owns(value, 'cacheControlFormat') &&
    !CACHE_CONTROL_FORMATS.includes(String(value.cacheControlFormat))
  )
    errors.push(
      tr('validation.invalid', { field: `${path}.cacheControlFormat` }),
    )
  for (const field of [
    'supportsReasoningEffort',
    'supportsDeveloperRole',
    'supportsStore',
    'supportsUsageInStreaming',
    'requiresToolResultName',
    'requiresAssistantAfterToolResult',
    'requiresThinkingAsText',
    'requiresReasoningContentOnAssistantMessages',
    'supportsStrictMode',
    'supportsLongCacheRetention',
    'supportsEagerToolInputStreaming',
    'supportsCacheControlOnTools',
    'supportsTemperature',
    'forceAdaptiveThinking',
    'allowEmptySignature',
    'supportsStrictTools',
  ])
    if (owns(value, field) && typeof value[field] !== 'boolean')
      errors.push(tr('validation.invalid', { field: `${path}.${field}` }))
}

export function validateReasoningEfforts(
  value: unknown,
  path: string,
  errors: string[],
): void {
  if (value === false) return
  if (!isObject(value) || Object.keys(value).length === 0) {
    errors.push(tr('validation.efforts'))
    return
  }
  for (const [level, wire] of Object.entries(value)) {
    if (!THINKING_LEVELS.includes(level as ThinkingLevel))
      errors.push(tr('validation.invalid', { field: `${path}.${level}` }))
    if (level === 'off') {
      if (wire !== null && typeof wire !== 'string')
        errors.push(tr('validation.invalid', { field: `${path}.off` }))
    } else if (typeof wire !== 'string' || wire.trim().length === 0)
      errors.push(tr('validation.invalid', { field: `${path}.${level}` }))
  }
}

export function validateModel(
  model: unknown,
  path: string,
  requireId: boolean = true,
): string[] {
  const errors: string[] = []
  if (!isObject(model)) return [tr('validation.object', { field: path })]
  if (
    requireId &&
    (typeof model.id !== 'string' || model.id.trim().length === 0)
  )
    errors.push(tr('validation.modelId', { index: path }))
  for (const field of ['contextWindow', 'maxTokens'])
    if (owns(model, field))
      numberError(
        model[field],
        `field.${field}`,
        errors,
        1,
        Number.MAX_SAFE_INTEGER,
        true,
      )
  if (
    owns(model, 'input') &&
    (!Array.isArray(model.input) ||
      model.input.some((item) => !MODALITIES.includes(item)))
  )
    errors.push(tr('validation.modalities'))
  if (owns(model, 'reasoningEfforts'))
    validateReasoningEfforts(
      model.reasoningEfforts,
      `${path}.reasoningEfforts`,
      errors,
    )
  if (owns(model, 'compat'))
    validateCompat(model.compat, `${path}.compat`, errors)
  return errors
}

export function validateRetryPolicy(value: unknown): string[] {
  const errors: string[] = []
  if (
    !isObject(value) ||
    !['normal', 'always'].includes(String(value.mode)) ||
    !isObject(value.backoff)
  )
    return [tr('validation.retry')]
  numberError(
    value.backoff.initialDelayMs,
    'field.initialDelayMs',
    errors,
    Number.MIN_VALUE,
    MAX_TIMER_DELAY_MS,
    false,
  )
  numberError(
    value.backoff.maxDelayMs,
    'field.maxDelayMs',
    errors,
    Number.MIN_VALUE,
    MAX_TIMER_DELAY_MS,
    false,
  )
  numberError(
    value.backoff.jitterRatio,
    'field.jitterRatio',
    errors,
    0,
    1,
    false,
  )
  if (Number(value.backoff.initialDelayMs) > Number(value.backoff.maxDelayMs))
    errors.push(tr('validation.backoffOrder'))
  if (value.mode === 'normal') {
    numberError(
      value.maxRetries,
      'field.maxRetries',
      errors,
      0,
      Number.MAX_SAFE_INTEGER,
      true,
    )
    if (
      !Array.isArray(value.retryableCodes) ||
      value.retryableCodes.length === 0 ||
      value.retryableCodes.some(
        (code) => typeof code !== 'string' || code.trim().length === 0,
      ) ||
      new Set(value.retryableCodes).size !== value.retryableCodes.length
    )
      errors.push(tr('validation.retryCodes'))
  }
  return errors
}

export function validateProfile(profile: unknown): string[] {
  const errors: string[] = []
  if (!isObject(profile))
    return [tr('validation.object', { field: tr('provider.label') })]
  if (
    owns(profile, 'apiKeyEnv') &&
    !/^[A-Za-z_][A-Za-z0-9_]*$/.test(String(profile.apiKeyEnv))
  )
    errors.push(tr('validation.credentialRef'))
  for (const field of ['displayName', 'baseURL'])
    if (
      owns(profile, field) &&
      (typeof profile[field] !== 'string' || profile[field].trim().length === 0)
    )
      errors.push(tr('validation.invalid', { field: tr(`field.${field}`) }))
  if (owns(profile, 'api') && !PROTOCOLS.includes(profile.api as Protocol))
    errors.push(tr('validation.protocol'))
  for (const field of ['defaultContextWindow', 'defaultMaxTokens'])
    if (owns(profile, field))
      numberError(
        profile[field],
        `field.${field}`,
        errors,
        1,
        Number.MAX_SAFE_INTEGER,
        true,
      )
  if (
    owns(profile, 'defaultInput') &&
    (!Array.isArray(profile.defaultInput) ||
      profile.defaultInput.length === 0 ||
      profile.defaultInput.some((item) => !MODALITIES.includes(item)))
  )
    errors.push(tr('validation.modalitiesRequired'))
  if (
    owns(profile, 'headers') &&
    (!isObject(profile.headers) ||
      Object.entries(profile.headers).some(
        ([key, value]) => key.trim().length === 0 || typeof value !== 'string',
      ))
  )
    errors.push(tr('validation.headers'))
  if (
    owns(profile, 'reasoning') &&
    !THINKING_LEVELS.includes(profile.reasoning as ThinkingLevel)
  )
    errors.push(tr('validation.reasoning'))
  if (owns(profile, 'thinkingBudgets')) {
    if (!isObject(profile.thinkingBudgets))
      errors.push(tr('validation.budgets'))
    else
      for (const [level, value] of Object.entries(profile.thinkingBudgets)) {
        if (!BUDGET_LEVELS.includes(level as BudgetLevel))
          errors.push(tr('validation.budgetLevel', { level }))
        else
          numberError(
            value,
            `field.${level}`,
            errors,
            0,
            Number.MAX_SAFE_INTEGER,
            true,
          )
      }
  }
  if (
    owns(profile, 'cacheRetention') &&
    !CACHE_RETENTIONS.includes(profile.cacheRetention as CacheRetention)
  )
    errors.push(tr('validation.cacheRetention'))
  if (
    owns(profile, 'transport') &&
    !TRANSPORTS.includes(profile.transport as Transport)
  )
    errors.push(tr('validation.transport'))
  for (const field of ['timeoutMs', 'websocketConnectTimeoutMs'])
    if (owns(profile, field))
      numberError(
        profile[field],
        `field.${field}`,
        errors,
        0,
        Number.MAX_SAFE_INTEGER,
        true,
      )
  if (owns(profile, 'streamIdleTimeoutMs'))
    numberError(
      profile.streamIdleTimeoutMs,
      'field.streamIdleTimeoutMs',
      errors,
      Number.MIN_VALUE,
      MAX_TIMER_DELAY_MS,
      false,
    )
  for (const field of [
    'maxRequestImageBytes',
    'requestImagePixelBudget',
    'requestImageMaxBytes',
  ])
    if (owns(profile, field))
      numberError(
        profile[field],
        `field.${field}`,
        errors,
        1,
        Number.MAX_SAFE_INTEGER,
        true,
      )
  if (owns(profile, 'compat'))
    validateCompat(profile.compat, tr('field.compat'), errors)
  if (owns(profile, 'retryPolicy'))
    errors.push(...validateRetryPolicy(profile.retryPolicy))
  if (owns(profile, 'models')) {
    if (!Array.isArray(profile.models)) errors.push(tr('validation.models'))
    else {
      const ids = new Set<string>()
      profile.models.forEach((entry, index) => {
        errors.push(
          ...validateModel(entry, tr('modelIndex', { index: index + 1 })),
        )
        if (isObject(entry) && typeof entry.id === 'string') {
          if (ids.has(entry.id))
            errors.push(tr('validation.duplicateModel', { id: entry.id }))
          ids.add(entry.id)
        }
      })
    }
  }
  if (owns(profile, 'modelOverrides')) {
    if (!isObject(profile.modelOverrides))
      errors.push(tr('validation.overrides'))
    else
      for (const [id, entry] of Object.entries(profile.modelOverrides))
        errors.push(...validateModel(entry, tr('overrideId', { id }), false))
  }
  if (owns(profile, 'models') && owns(profile, 'modelOverrides'))
    errors.push(tr('validation.catalogConflict'))
  return errors
}

export function validateOfficialProfile(profile: unknown): string[] {
  const errors: string[] = []
  if (!isObject(profile))
    return [tr('validation.object', { field: tr('official.title') })]
  if (
    owns(profile, 'apiKeyEnv') &&
    !/^[A-Za-z_][A-Za-z0-9_]*$/.test(String(profile.apiKeyEnv))
  )
    errors.push(tr('validation.credentialRef'))
  if (
    owns(profile, 'baseURL') &&
    (typeof profile.baseURL !== 'string' || profile.baseURL.trim().length === 0)
  )
    errors.push(tr('validation.invalid', { field: tr('field.baseURL') }))
  if (
    owns(profile, 'thinking') &&
    !OFFICIAL_THINKING.includes(String(profile.thinking))
  )
    errors.push(tr('validation.invalid', { field: tr('field.thinking') }))
  if (
    owns(profile, 'reasoningEffort') &&
    !OFFICIAL_REASONING.includes(String(profile.reasoningEffort))
  )
    errors.push(
      tr('validation.invalid', { field: tr('field.reasoningEffort') }),
    )
  if (
    profile.thinking === 'disabled' &&
    owns(profile, 'reasoningEffort') &&
    profile.reasoningEffort !== 'off'
  )
    errors.push(tr('validation.thinkingDisabledReasoning'))
  for (const field of [
    'maxTokens',
    'defaultContextWindow',
    'maxRequestFilesBytes',
    'maxInlineRequestImageBytes',
    'maxImagesPerRequest',
    'imageOffloadByteQuantum',
    'inlineImageOffloadByteQuantum',
    'imageOffloadCountQuantum',
  ])
    if (owns(profile, field))
      numberError(
        profile[field],
        `field.${field}`,
        errors,
        1,
        Number.MAX_SAFE_INTEGER,
        true,
      )
  if (
    owns(profile, 'imageOffloadByteQuantum') &&
    owns(profile, 'maxRequestFilesBytes') &&
    typeof profile.imageOffloadByteQuantum === 'number' &&
    typeof profile.maxRequestFilesBytes === 'number' &&
    profile.imageOffloadByteQuantum > profile.maxRequestFilesBytes
  )
    errors.push(
      tr('validation.quantumExceedsMax', {
        field: tr('field.imageOffloadByteQuantum'),
        max: tr('field.maxRequestFilesBytes'),
      }),
    )
  if (
    owns(profile, 'inlineImageOffloadByteQuantum') &&
    owns(profile, 'maxInlineRequestImageBytes') &&
    typeof profile.inlineImageOffloadByteQuantum === 'number' &&
    typeof profile.maxInlineRequestImageBytes === 'number' &&
    profile.inlineImageOffloadByteQuantum > profile.maxInlineRequestImageBytes
  )
    errors.push(
      tr('validation.quantumExceedsMax', {
        field: tr('field.inlineImageOffloadByteQuantum'),
        max: tr('field.maxInlineRequestImageBytes'),
      }),
    )
  if (
    owns(profile, 'imageOffloadCountQuantum') &&
    owns(profile, 'maxImagesPerRequest') &&
    typeof profile.imageOffloadCountQuantum === 'number' &&
    typeof profile.maxImagesPerRequest === 'number' &&
    profile.imageOffloadCountQuantum > profile.maxImagesPerRequest
  )
    errors.push(
      tr('validation.quantumExceedsMax', {
        field: tr('field.imageOffloadCountQuantum'),
        max: tr('field.maxImagesPerRequest'),
      }),
    )
  for (const field of ['streamIdleTimeoutMs', 'filesApiTimeoutMs'])
    if (owns(profile, field))
      numberError(
        profile[field],
        `field.${field}`,
        errors,
        Number.MIN_VALUE,
        MAX_TIMER_DELAY_MS,
        false,
      )
  if (owns(profile, 'fileExpiresAfterSeconds'))
    numberError(
      profile.fileExpiresAfterSeconds,
      'field.fileExpiresAfterSeconds',
      errors,
      3600,
      2592000,
      true,
    )
  if (owns(profile, 'fileRefreshMarginSeconds'))
    numberError(
      profile.fileRefreshMarginSeconds,
      'field.fileRefreshMarginSeconds',
      errors,
      0,
      Number.MAX_SAFE_INTEGER,
      true,
    )
  if (
    owns(profile, 'fileRefreshMarginSeconds') &&
    owns(profile, 'fileExpiresAfterSeconds') &&
    typeof profile.fileRefreshMarginSeconds === 'number' &&
    typeof profile.fileExpiresAfterSeconds === 'number' &&
    profile.fileRefreshMarginSeconds >= profile.fileExpiresAfterSeconds
  )
    errors.push(tr('validation.fileRefreshOrder'))
  if (owns(profile, 'fileQuotaCleanupBatch'))
    numberError(
      profile.fileQuotaCleanupBatch,
      'field.fileQuotaCleanupBatch',
      errors,
      1,
      1000,
      true,
    )
  if (owns(profile, 'models')) {
    if (!Array.isArray(profile.models)) errors.push(tr('validation.models'))
    else {
      const seenIds = new Set<string>()
      profile.models.forEach((entry, index) => {
        const path = tr('modelIndex', { index: index + 1 })
        if (
          !isObject(entry) ||
          typeof entry.id !== 'string' ||
          entry.id.trim().length === 0
        )
          errors.push(tr('validation.modelId', { index: index + 1 }))
        else {
          if (seenIds.has(entry.id))
            errors.push(tr('validation.duplicateModel', { id: entry.id }))
          seenIds.add(entry.id)
        }
        if (isObject(entry)) {
          if (
            owns(entry, 'name') &&
            (typeof entry.name !== 'string' || entry.name.trim().length === 0)
          )
            errors.push(tr('validation.invalid', { field: `${path}.name` }))
          for (const field of ['contextWindow', 'maxTokens'])
            if (owns(entry, field))
              numberError(
                entry[field],
                `field.${field}`,
                errors,
                1,
                Number.MAX_SAFE_INTEGER,
                true,
              )
          const modalities = owns(entry, 'inputModalities')
            ? entry.inputModalities
            : owns(entry, 'input')
              ? entry.input
              : undefined
          if (modalities !== undefined) {
            if (
              !Array.isArray(modalities) ||
              modalities.length === 0 ||
              modalities.some((item) => !MODALITIES.includes(item)) ||
              new Set(modalities).size !== modalities.length
            )
              errors.push(tr('validation.modalities'))
          }
          const hasImage =
            Array.isArray(modalities) && modalities.includes('image')
          if (!hasImage) {
            if (
              owns(entry, 'imagePixelBudget') ||
              owns(entry, 'imageMaxBytes') ||
              owns(entry, 'imageDetail')
            )
              errors.push(tr('validation.textOnlyImageLimits'))
          } else {
            for (const field of ['imagePixelBudget', 'imageMaxBytes'])
              if (owns(entry, field))
                numberError(
                  entry[field],
                  `field.${field}`,
                  errors,
                  1,
                  Number.MAX_SAFE_INTEGER,
                  true,
                )
            if (
              owns(entry, 'imageDetail') &&
              !IMAGE_DETAILS.includes(String(entry.imageDetail))
            )
              errors.push(
                tr('validation.invalid', {
                  field: `${path}.imageDetail`,
                }),
              )
          }
        }
      })
    }
  }
  if (owns(profile, 'retryPolicy'))
    errors.push(...validateRetryPolicy(profile.retryPolicy))
  return errors
}
