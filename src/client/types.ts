export type Modality = 'text' | 'image'

export type ThinkingLevel =
  'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'

export type Protocol =
  'openai-completions' | 'openai-responses' | 'anthropic-messages'

export type Transport = 'sse' | 'websocket' | 'websocket-cached' | 'auto'

export type CacheRetention = 'none' | 'short' | 'long'

export type RetryMode = 'normal' | 'always'

export type BudgetLevel = 'minimal' | 'low' | 'medium' | 'high'

export interface CompatProfile {
  thinkingFormat?: string
  supportsReasoningEffort?: boolean
  supportsDeveloperRole?: boolean
  supportsStore?: boolean
  supportsUsageInStreaming?: boolean
  maxTokensField?: string
  requiresToolResultName?: boolean
  requiresAssistantAfterToolResult?: boolean
  requiresThinkingAsText?: boolean
  requiresReasoningContentOnAssistantMessages?: boolean
  supportsStrictMode?: boolean
  cacheControlFormat?: string
  supportsLongCacheRetention?: boolean
  supportsEagerToolInputStreaming?: boolean
  supportsCacheControlOnTools?: boolean
  supportsTemperature?: boolean
  forceAdaptiveThinking?: boolean
  allowEmptySignature?: boolean
  supportsStrictTools?: boolean
}

export interface ReasoningEfforts {
  [level: string]: string | null
}

export interface ModelProfile {
  id?: string
  name?: string
  description?: string
  contextWindow?: number
  maxTokens?: number
  input?: Modality[]
  inputModalities?: Modality[]
  imagePixelBudget?: number
  imageMaxBytes?: number
  imageDetail?: 'auto' | 'low'
  reasoningEfforts?: false | ReasoningEfforts
  compat?: CompatProfile
}

export interface BackoffConfig {
  initialDelayMs?: number
  maxDelayMs?: number
  jitterRatio?: number
}

export interface RetryPolicyConfig {
  mode?: RetryMode
  maxRetries?: number
  retryableCodes?: string[]
  backoff?: BackoffConfig
}

export interface ProviderProfile {
  apiKeyEnv?: string
  displayName?: string
  api?: Protocol
  baseURL?: string
  models?: ModelProfile[]
  modelOverrides?: Record<string, ModelProfile>
  compat?: CompatProfile
  defaultContextWindow?: number
  defaultMaxTokens?: number
  defaultInput?: Modality[]
  headers?: Record<string, string>
  reasoning?: ThinkingLevel
  thinkingBudgets?: Partial<Record<BudgetLevel, number>>
  cacheRetention?: CacheRetention
  transport?: Transport
  timeoutMs?: number
  websocketConnectTimeoutMs?: number
  streamIdleTimeoutMs?: number
  maxRequestImageBytes?: number
  requestImagePixelBudget?: number
  requestImageMaxBytes?: number
  retryPolicy?: RetryPolicyConfig
  [key: string]: unknown
}

export interface OfficialProfile {
  apiKeyEnv?: string
  baseURL?: string
  thinking?: 'enabled' | 'disabled'
  reasoningEffort?: 'off' | 'low' | 'high' | 'max'
  maxTokens?: number
  defaultContextWindow?: number
  models?: ModelProfile[]
  streamIdleTimeoutMs?: number
  maxRequestFilesBytes?: number
  maxInlineRequestImageBytes?: number
  maxImagesPerRequest?: number
  imageOffloadByteQuantum?: number
  inlineImageOffloadByteQuantum?: number
  imageOffloadCountQuantum?: number
  filesApiTimeoutMs?: number
  fileExpiresAfterSeconds?: number
  fileRefreshMarginSeconds?: number
  fileQuotaCleanupBatch?: number
  retryPolicy?: RetryPolicyConfig
  [key: string]: unknown
}

export interface SettingsNamespaceView {
  ns: string
  value?: unknown
  user?: unknown
  base?: unknown
  revision: number
}

export interface ProviderRow {
  provider: string
  displayName: string
  settingsNs: string
  settingsPath: string[]
  active?: boolean
  declared?: boolean
  api: ModelApi
  userAdded?: boolean
  configured?: ProviderProfile
}

export interface EditorState {
  profile: ProviderProfile
  explicit: Record<string, boolean>
}

export type SettingsPathOp =
  | { op: 'set'; path: string[]; value: unknown }
  | { op: 'unset'; path: string[] }

export interface RpcEnvelope {
  result:
    { ok: true; value: unknown } | { ok: false; error: { message: string } }
}

/**
 * The settings/LLM Web API surface used by the advanced model pages.
 * `ctx.connection.api` satisfies it structurally.
 */
export interface ModelApi {
  llm: {
    providers(input?: unknown): Promise<RpcEnvelope>
    discoverModels(input?: unknown): Promise<RpcEnvelope>
  }
  settings: {
    describe(input?: unknown): Promise<RpcEnvelope>
    mutate(input: unknown): Promise<RpcEnvelope>
  }
  credentials: {
    describe(input?: unknown): Promise<RpcEnvelope>
    set(input: unknown): Promise<RpcEnvelope>
    unset(input: unknown): Promise<RpcEnvelope>
  }
}

export type Translator = (key: string) => string | undefined
