import type {
  BudgetLevel,
  CacheRetention,
  Modality,
  Protocol,
  ThinkingLevel,
  ToolUpdate,
  Transport,
} from './types.ts'

export const SETTINGS_NS: string = 'llm-pi-ai'
export const OFFICIAL_NS: string = 'llm-deepseek'
export const LOCALE_NS: string = '@local/dsh-advanced-model-editor'

export const PROFILE_FIELDS: string[] = [
  'apiKeyEnv',
  'displayName',
  'api',
  'baseURL',
  'models',
  'modelOverrides',
  'compat',
  'defaultContextWindow',
  'defaultMaxTokens',
  'defaultInput',
  'headers',
  'reasoning',
  'thinkingBudgets',
  'cacheRetention',
  'transport',
  'timeoutMs',
  'websocketConnectTimeoutMs',
  'streamIdleTimeoutMs',
  'maxRequestImageBytes',
  'maxRequestImages',
  'imageOffloadCountQuantum',
  'requestImagePixelBudget',
  'requestImageMaxBytes',
  'retryPolicy',
]

export const OFFICIAL_FIELDS: string[] = [
  'apiKeyEnv',
  'baseURL',
  'thinking',
  'reasoningEffort',
  'maxTokens',
  'defaultContextWindow',
  'models',
  'streamIdleTimeoutMs',
  'modelsTimeoutMs',
  'modelsMaxAgeMs',
  'maxRequestFilesBytes',
  'maxInlineRequestImageBytes',
  'maxImagesPerRequest',
  'imageOffloadByteQuantum',
  'inlineImageOffloadByteQuantum',
  'imageOffloadCountQuantum',
  'filesApiTimeoutMs',
  'fileExpiresAfterSeconds',
  'fileRefreshMarginSeconds',
  'fileQuotaCleanupBatch',
  'retryPolicy',
]

export const THINKING_LEVELS: ThinkingLevel[] = [
  'off',
  'minimal',
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
]

export const BUDGET_LEVELS: BudgetLevel[] = ['minimal', 'low', 'medium', 'high']
export const MODALITIES: Modality[] = ['text', 'image']

export const THINKING_FORMATS: string[] = [
  'openai',
  'deepseek',
  'openrouter',
  'together',
  'baseten',
  'zai',
  'qwen',
  'chat-template',
  'qwen-chat-template',
  'string-thinking',
  'ant-ling',
]

// Declaration order is the adapter's own, which is what a select shows.
export const MAX_TOKENS_FIELDS: string[] = [
  'max_completion_tokens',
  'max_tokens',
]

export const THINKING_TOKEN_BUDGET_FIELDS: string[] = [
  'thinking_token_budget',
  'thinking_budget',
  'thinking_budget_tokens',
]

export const CACHE_CONTROL_FORMATS: string[] = ['anthropic']

// The compat field set lives in ./compat.ts, which also carries each field's
// control kind. Keeping a second allow-list here is what let the editor fall
// two fields behind the adapter it was supposed to offer.

// Declaration order is the adapter's own table, which is what a select shows
// and why the first entry is the default a new route starts on.
export const PROTOCOLS: Protocol[] = [
  'openai-completions',
  'openai-responses',
  'anthropic-messages',
  'google-generative-ai',
]

/**
 * The one protocol whose reasoning levels come from a fixed vocabulary: pi-ai's
 * Gemini implementation maps a level through `thinkingLevelMap` and then throws
 * unless the result is `minimal`, `low`, `medium`, or `high`. A route on it
 * offers only these, and its form of "off" is a disabled thinking
 * configuration rather than a level name.
 */
export const GEMINI_PROTOCOL: Protocol = 'google-generative-ai'

/** Reasoning levels pi-ai's Gemini implementation accepts as a wire value. */
export const GEMINI_REASONING_LEVELS: ThinkingLevel[] = [
  'minimal',
  'low',
  'medium',
  'high',
]

export const TRANSPORTS: Transport[] = [
  'sse',
  'websocket',
  'websocket-cached',
  'auto',
]

export const CACHE_RETENTIONS: CacheRetention[] = ['none', 'short', 'long']
export const OFFICIAL_THINKING: string[] = ['enabled', 'disabled']
export const OFFICIAL_REASONING: string[] = ['off', 'low', 'high', 'max']
export const TOOL_UPDATES: ToolUpdate[] = ['in-history', 'addition-only']

// The adapter's own defaults for the fields a normal policy may omit. Kept
// beside the codes because both describe the same shape, and read by the
// control so a policy the user builds matches one the adapter would build.
export const DEFAULT_MAX_RETRIES = 5
export const DEFAULT_INITIAL_DELAY_MS = 500
export const DEFAULT_MAX_DELAY_MS = 10000
export const DEFAULT_JITTER_RATIO = 0.1

export const DEFAULT_RETRYABLE_CODES: string[] = [
  'EMPTY_RESPONSE',
  'RATE_LIMIT',
  'SERVER',
  'TIMEOUT',
  'TRANSPORT',
]

export const MAX_TIMER_DELAY_MS: number = 2147483647
