export type Modality = 'text' | 'image'

export type ThinkingLevel =
  'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'

export type Protocol =
  'openai-completions' | 'openai-responses' | 'anthropic-messages'

export type Transport = 'sse' | 'websocket' | 'websocket-cached' | 'auto'

export type CacheRetention = 'none' | 'short' | 'long'

export type ToolUpdate = 'in-history' | 'addition-only'

export type BudgetLevel = 'minimal' | 'low' | 'medium' | 'high'

export type ChatTemplateKwargValue =
  | string
  | number
  | boolean
  | null
  | {
      $var: 'thinking.enabled' | 'thinking.effort' | 'thinking.budget'
      omitWhenOff?: boolean
    }

export interface CompatProfile {
  thinkingFormat?: string
  supportsReasoningEffort?: boolean
  supportsDeveloperRole?: boolean
  supportsStore?: boolean
  supportsUsageInStreaming?: boolean
  supportsFinishReason?: boolean
  maxTokensField?: string
  requiresToolResultName?: boolean
  requiresAssistantAfterToolResult?: boolean
  requiresThinkingAsText?: boolean
  requiresReasoningContentOnAssistantMessages?: boolean
  chatTemplateKwargs?: Record<string, ChatTemplateKwargValue>
  chatTemplateArgs?: Record<string, ChatTemplateKwargValue>
  supportsThinkingTokenBudget?: boolean
  thinkingTokenBudgetField?: string
  vllmPriority?: number
  supportsStrictMode?: boolean
  supportsMaxOutputTokens?: boolean
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
  imagePixelBudget?: number | 'low'
  imageMaxBytes?: number
  systemPromptUpdate?: 'in-history'
  toolUpdate?: ToolUpdate
  reasoningEfforts?: false | ReasoningEfforts
  compat?: CompatProfile
}

/**
 * One model an endpoint disclosed through `llm/discoverModels`
 * (`LlmDiscoveredModel` on the wire). Every field is optional: an endpoint
 * may report only the id.
 */
export interface DiscoveredModel {
  id?: string
  name?: string
  description?: string
  contextWindow?: number
  maxTokens?: number
  /** Accepted input types the endpoint disclosed; absent means unknown. */
  inputModalities?: Modality[]
}

export interface BackoffConfig {
  initialDelayMs?: number
  maxDelayMs?: number
  jitterRatio?: number
}

/** Retry only the configured transient failure codes. */
export interface NormalRetryPolicyConfig {
  mode: 'normal'
  maxRetries?: number
  retryableCodes?: string[]
  backoff?: BackoffConfig
}

/** Retry every model-request failure until success, cancellation, or disposal. */
export interface AlwaysRetryPolicyConfig {
  mode: 'always'
  backoff?: BackoffConfig
}

/** Provider-owned model-request retry policy; `mode` discriminates the two shapes. */
export type RetryPolicyConfig =
  NormalRetryPolicyConfig | AlwaysRetryPolicyConfig

export type RetryMode = RetryPolicyConfig['mode']

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

/**
 * The subset of a redacted settings namespace view that this page reads.
 * `remote.settings.describe()` returns more (`schema`, `secrets`, `applies`,
 * `autoGenerate`, and a resolved `base`); none of it is needed here.
 */
export interface SettingsNamespaceView {
  ns: string
  /** Serialized schemastery schema envelope (`schema.toJSON()`); rehydrate before reading. */
  schema: unknown
  value?: unknown
  /** Redacted composition base layer, with defaults resolved. */
  base?: unknown
  user?: unknown
  revision: number
}

/**
 * Authentication a provider route performs without a credential reference in
 * its profile (`LlmNativeAuth` on the DSH 0.2.1 wire). `env` lists the
 * environment variables the route's own authentication reads, in lookup
 * order; `oauth` reports whether a stored OAuth sign-in can authenticate it.
 */
export interface LlmNativeAuth {
  env: readonly string[]
  oauth: boolean
}

/** Redacted credential state for one reference (`CredentialInfo` on the wire). */
export interface CredentialInfo {
  configured: boolean
  source?: string
  writable: boolean
}

export interface ProviderRow {
  provider: string
  displayName: string
  settingsNs: string
  settingsPath: string[]
  active?: boolean
  declared?: boolean
  /** Route endpoint used when the profile sets no `baseURL`; absent when none is fixed. */
  defaultBaseURL?: string
  /** Environment variables the route uses to construct its endpoint. */
  baseURLEnv?: string[]
  /** Provider-native authentication the route performs without a credential reference. */
  nativeAuth?: LlmNativeAuth
  /** Configuration diagnostic for repair; unaffected models may remain serviceable. */
  error?: string
  /** Redacted state per native-auth reference, when the page read it. */
  credentialChecks?: Readonly<Record<string, CredentialInfo>>
  /** Whether the user layer carries this route's profile. */
  userAdded?: boolean
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
 * The LLM and credential Web API surface used by the advanced model pages.
 * Adapted from `ctx.remote` by `createModelApi`. Settings reads and writes
 * are deliberately absent: DSH 0.2.1 routes them through the shared
 * `ctx.configForms` mirror and write queue (see ./settings.ts).
 */
export interface ModelApi {
  llm: {
    providers(input?: unknown): Promise<RpcEnvelope>
    discoverModels(input?: unknown): Promise<RpcEnvelope>
  }
  credentials: {
    describe(input?: unknown): Promise<RpcEnvelope>
    set(input: unknown): Promise<RpcEnvelope>
    unset(input: unknown): Promise<RpcEnvelope>
  }
}

export type Translator = (key: string) => string | undefined
