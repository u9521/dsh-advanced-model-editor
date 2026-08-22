import type {
  BudgetLevel,
  CacheRetention,
  Modality,
  Protocol,
  ThinkingLevel,
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
export const IMAGE_DETAILS: string[] = ['auto', 'low']

export const THINKING_FORMATS: string[] = [
  'openai',
  'deepseek',
  'openrouter',
  'together',
  'zai',
  'qwen',
  'chat-template',
  'qwen-chat-template',
  'string-thinking',
  'ant-ling',
]

export const MAX_TOKENS_FIELDS: string[] = [
  'max_tokens',
  'max_completion_tokens',
]

export const CACHE_CONTROL_FORMATS: string[] = ['anthropic']

export const PROTOCOL_COMPAT_FIELDS: Record<string, string[]> = {
  'openai-completions': [
    'thinkingFormat',
    'supportsReasoningEffort',
    'supportsDeveloperRole',
    'supportsStore',
    'supportsUsageInStreaming',
    'maxTokensField',
    'requiresToolResultName',
    'requiresAssistantAfterToolResult',
    'requiresThinkingAsText',
    'requiresReasoningContentOnAssistantMessages',
    'supportsStrictMode',
    'cacheControlFormat',
    'supportsLongCacheRetention',
  ],
  'openai-responses': [
    'supportsDeveloperRole',
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

export const PROTOCOLS: Protocol[] = [
  'openai-completions',
  'openai-responses',
  'anthropic-messages',
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

export const DEFAULT_RETRYABLE_CODES: string[] = [
  'EMPTY_RESPONSE',
  'RATE_LIMIT',
  'SERVER',
  'TIMEOUT',
  'TRANSPORT',
]

export const MAX_TIMER_DELAY_MS: number = 2147483647
