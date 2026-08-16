export type Modality = "text" | "image";
export type ThinkingLevel =
	"off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";
export type Protocol =
	"openai-completions" | "openai-responses" | "anthropic-messages";
export type Transport = "sse" | "websocket" | "websocket-cached" | "auto";
export type CacheRetention = "none" | "short" | "long";
export type RetryMode = "normal" | "always";
export type BudgetLevel = "minimal" | "low" | "medium" | "high";

export interface CompatProfile {
	thinkingFormat?: string;
	supportsReasoningEffort?: boolean;
}

export interface ReasoningEfforts {
	[level: string]: string | null;
}

export interface ModelProfile {
	id?: string;
	name?: string;
	description?: string;
	contextWindow?: number;
	maxTokens?: number;
	input?: Modality[];
	reasoningEfforts?: false | ReasoningEfforts;
	compat?: CompatProfile;
}

export interface BackoffConfig {
	initialDelayMs?: number;
	maxDelayMs?: number;
	jitterRatio?: number;
}

export interface RetryPolicyConfig {
	mode?: RetryMode;
	maxRetries?: number;
	retryableCodes?: string[];
	backoff?: BackoffConfig;
}

export interface ProviderProfile {
	apiKeyEnv?: string;
	displayName?: string;
	api?: Protocol;
	baseURL?: string;
	models?: ModelProfile[];
	modelOverrides?: Record<string, ModelProfile>;
	compat?: CompatProfile;
	defaultContextWindow?: number;
	defaultMaxTokens?: number;
	defaultInput?: Modality[];
	headers?: Record<string, string>;
	reasoning?: ThinkingLevel;
	thinkingBudgets?: Partial<Record<BudgetLevel, number>>;
	cacheRetention?: CacheRetention;
	transport?: Transport;
	timeoutMs?: number;
	websocketConnectTimeoutMs?: number;
	streamIdleTimeoutMs?: number;
	retryPolicy?: RetryPolicyConfig;
	[key: string]: unknown;
}

export interface OfficialProfile {
	apiKeyEnv?: string;
	baseURL?: string;
	thinking?: "enabled" | "disabled";
	reasoningEffort?: "off" | "high" | "max";
	maxTokens?: number;
	defaultContextWindow?: number;
	models?: ModelProfile[];
	streamIdleTimeoutMs?: number;
	retryPolicy?: RetryPolicyConfig;
	[key: string]: unknown;
}

export interface SettingsNamespaceView {
	ns: string;
	value?: unknown;
	user?: unknown;
	base?: unknown;
	revision: number;
}

export interface ProviderRow {
	provider: string;
	displayName: string;
	settingsNs: string;
	settingsPath: string[];
	active?: boolean;
	declared?: boolean;
	api: ModelApi;
	userAdded?: boolean;
	configured?: ProviderProfile;
}

export interface EditorState {
	profile: ProviderProfile;
	explicit: Record<string, boolean>;
}

export type SettingsPathOp =
	| { op: "set"; path: string[]; value: unknown }
	| { op: "unset"; path: string[] };

export interface RpcEnvelope {
	result:
		| { ok: true; value: unknown }
		| { ok: false; error: { message: string } };
}

/**
 * The settings/LLM Web API surface used by the advanced model pages.
 * `ctx.connection.api` satisfies it structurally.
 */
export interface ModelApi {
	llm: {
		providers(input?: unknown): Promise<RpcEnvelope>;
		discoverModels(input?: unknown): Promise<RpcEnvelope>;
	};
	settings: {
		describe(input?: unknown): Promise<RpcEnvelope>;
		mutate(input: unknown): Promise<RpcEnvelope>;
	};
	credentials: {
		describe(input?: unknown): Promise<RpcEnvelope>;
		set(input: unknown): Promise<RpcEnvelope>;
		unset(input: unknown): Promise<RpcEnvelope>;
	};
}

export type Translator = (key: string) => string | undefined;

export const SETTINGS_NS: string = "llm-pi-ai";
export const OFFICIAL_NS: string = "llm-deepseek";
export const LOCALE_NS: string = "@local/dsh-advanced-model-editor";
export const PROFILE_FIELDS: string[] = [
	"apiKeyEnv",
	"displayName",
	"api",
	"baseURL",
	"models",
	"modelOverrides",
	"compat",
	"defaultContextWindow",
	"defaultMaxTokens",
	"defaultInput",
	"headers",
	"reasoning",
	"thinkingBudgets",
	"cacheRetention",
	"transport",
	"timeoutMs",
	"websocketConnectTimeoutMs",
	"streamIdleTimeoutMs",
	"retryPolicy",
];
export const OFFICIAL_FIELDS: string[] = [
	"apiKeyEnv",
	"baseURL",
	"thinking",
	"reasoningEffort",
	"maxTokens",
	"defaultContextWindow",
	"models",
	"streamIdleTimeoutMs",
	"retryPolicy",
];
export const THINKING_LEVELS: ThinkingLevel[] = [
	"off",
	"minimal",
	"low",
	"medium",
	"high",
	"xhigh",
	"max",
];
export const BUDGET_LEVELS: BudgetLevel[] = [
	"minimal",
	"low",
	"medium",
	"high",
];
export const MODALITIES: Modality[] = ["text", "image"];
export const THINKING_FORMATS: string[] = [
	"openai",
	"deepseek",
	"openrouter",
	"together",
	"zai",
	"qwen",
	"string-thinking",
	"ant-ling",
];
export const PROTOCOLS: Protocol[] = [
	"openai-completions",
	"openai-responses",
	"anthropic-messages",
];
export const TRANSPORTS: Transport[] = [
	"sse",
	"websocket",
	"websocket-cached",
	"auto",
];
export const CACHE_RETENTIONS: CacheRetention[] = ["none", "short", "long"];
export const OFFICIAL_THINKING: string[] = ["enabled", "disabled"];
export const OFFICIAL_REASONING: string[] = ["off", "high", "max"];
export const DEFAULT_RETRYABLE_CODES: string[] = [
	"EMPTY_RESPONSE",
	"RATE_LIMIT",
	"SERVER",
	"TIMEOUT",
	"TRANSPORT",
];
export const MAX_TIMER_DELAY_MS: number = 2147483647;

let translate: Translator = (key) => key;

export function setTranslator(next: Translator): void {
	translate = typeof next === "function" ? next : (key) => key;
}

export function tr(
	key: string,
	vars?: Record<string, string | number>,
): string {
	let value = translate(key);
	if (typeof value !== "string") value = key;
	if (vars)
		for (const [name, replacement] of Object.entries(vars))
			value = value.replaceAll(`{${name}}`, String(replacement));
	return value;
}

export function isObject(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function owns(value: unknown, key: string): boolean {
	return isObject(value) && Object.prototype.hasOwnProperty.call(value, key);
}

export function clone<T>(value: T): T {
	if (Array.isArray(value)) return value.map((item) => clone(item)) as T;
	if (isObject(value))
		return Object.fromEntries(
			Object.entries(value).map(([key, item]) => [key, clone(item)]),
		) as T;
	return value;
}

export function equal(left: unknown, right: unknown): boolean {
	if (left === right) return true;
	if (Array.isArray(left) || Array.isArray(right))
		return (
			Array.isArray(left) &&
			Array.isArray(right) &&
			left.length === right.length &&
			left.every((item, index) => equal(item, right[index]))
		);
	if (!isObject(left) || !isObject(right)) return false;
	const keys = Object.keys(left);
	return (
		keys.length === Object.keys(right).length &&
		keys.every((key) => owns(right, key) && equal(left[key], right[key]))
	);
}

export function at(source: unknown, path: string[]): unknown {
	let current: unknown = source;
	for (const part of path) {
		if (!isObject(current) || !owns(current, part)) return undefined;
		current = current[part];
	}
	return current;
}

export function setIn(
	source: ProviderProfile,
	field: string,
	value: unknown,
): ProviderProfile {
	const next = clone(source);
	if (value === undefined) delete next[field];
	else next[field] = clone(value);
	return next;
}

export function valueOf<T = unknown>(response: RpcEnvelope): T {
	if (!response.result.ok) throw new Error(response.result.error.message);
	return response.result.value as T;
}

export function responseMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export function deriveKeyRef(provider: string): string {
	return `${provider.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_API_KEY`;
}

function numberError(
	value: unknown,
	key: string,
	errors: string[],
	min: number,
	max: number,
	integer: boolean,
): void {
	if (
		typeof value !== "number" ||
		!Number.isFinite(value) ||
		value < min ||
		value > max ||
		(integer && !Number.isInteger(value))
	)
		errors.push(tr("validation.number", { field: tr(key) }));
}

function validateCompat(value: unknown, path: string, errors: string[]): void {
	if (!isObject(value)) {
		errors.push(tr("validation.object", { field: path }));
		return;
	}
	if (
		owns(value, "thinkingFormat") &&
		!THINKING_FORMATS.includes(String(value.thinkingFormat))
	)
		errors.push(
			tr("validation.invalid", { field: `${path}.thinkingFormat` }),
		);
	if (
		owns(value, "supportsReasoningEffort") &&
		typeof value.supportsReasoningEffort !== "boolean"
	)
		errors.push(
			tr("validation.invalid", {
				field: `${path}.supportsReasoningEffort`,
			}),
		);
}

function validateReasoningEfforts(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (value === false) return;
	if (!isObject(value) || Object.keys(value).length === 0) {
		errors.push(tr("validation.efforts"));
		return;
	}
	for (const [level, wire] of Object.entries(value)) {
		if (!THINKING_LEVELS.includes(level as ThinkingLevel))
			errors.push(
				tr("validation.invalid", { field: `${path}.${level}` }),
			);
		if (level === "off") {
			if (wire !== null && typeof wire !== "string")
				errors.push(tr("validation.invalid", { field: `${path}.off` }));
		} else if (typeof wire !== "string" || wire.trim().length === 0)
			errors.push(
				tr("validation.invalid", { field: `${path}.${level}` }),
			);
	}
}

export function validateModel(
	model: unknown,
	path: string,
	requireId: boolean = true,
): string[] {
	const errors: string[] = [];
	if (!isObject(model)) return [tr("validation.object", { field: path })];
	if (
		requireId &&
		(typeof model.id !== "string" || model.id.trim().length === 0)
	)
		errors.push(tr("validation.modelId", { index: path }));
	for (const field of ["contextWindow", "maxTokens"])
		if (owns(model, field))
			numberError(
				model[field],
				`field.${field}`,
				errors,
				1,
				Number.MAX_SAFE_INTEGER,
				true,
			);
	if (
		owns(model, "input") &&
		(!Array.isArray(model.input) ||
			model.input.some((item) => !MODALITIES.includes(item)))
	)
		errors.push(tr("validation.modalities"));
	if (owns(model, "reasoningEfforts"))
		validateReasoningEfforts(
			model.reasoningEfforts,
			`${path}.reasoningEfforts`,
			errors,
		);
	if (owns(model, "compat"))
		validateCompat(model.compat, `${path}.compat`, errors);
	return errors;
}

export function validateRetryPolicy(value: unknown): string[] {
	const errors: string[] = [];
	if (
		!isObject(value) ||
		!["normal", "always"].includes(String(value.mode)) ||
		!isObject(value.backoff)
	)
		return [tr("validation.retry")];
	numberError(
		value.backoff.initialDelayMs,
		"field.initialDelayMs",
		errors,
		Number.MIN_VALUE,
		MAX_TIMER_DELAY_MS,
		false,
	);
	numberError(
		value.backoff.maxDelayMs,
		"field.maxDelayMs",
		errors,
		Number.MIN_VALUE,
		MAX_TIMER_DELAY_MS,
		false,
	);
	numberError(
		value.backoff.jitterRatio,
		"field.jitterRatio",
		errors,
		0,
		1,
		false,
	);
	if (Number(value.backoff.initialDelayMs) > Number(value.backoff.maxDelayMs))
		errors.push(tr("validation.backoffOrder"));
	if (value.mode === "normal") {
		numberError(
			value.maxRetries,
			"field.maxRetries",
			errors,
			0,
			Number.MAX_SAFE_INTEGER,
			true,
		);
		if (
			!Array.isArray(value.retryableCodes) ||
			value.retryableCodes.length === 0 ||
			value.retryableCodes.some(
				(code) => typeof code !== "string" || code.trim().length === 0,
			) ||
			new Set(value.retryableCodes).size !== value.retryableCodes.length
		)
			errors.push(tr("validation.retryCodes"));
	}
	return errors;
}

export function validateProfile(profile: unknown): string[] {
	const errors: string[] = [];
	if (!isObject(profile))
		return [tr("validation.object", { field: tr("provider.label") })];
	if (
		owns(profile, "apiKeyEnv") &&
		!/^[A-Za-z_][A-Za-z0-9_]*$/.test(String(profile.apiKeyEnv))
	)
		errors.push(tr("validation.credentialRef"));
	for (const field of ["displayName", "baseURL"])
		if (
			owns(profile, field) &&
			(typeof profile[field] !== "string" ||
				profile[field].trim().length === 0)
		)
			errors.push(
				tr("validation.invalid", { field: tr(`field.${field}`) }),
			);
	if (owns(profile, "api") && !PROTOCOLS.includes(profile.api as Protocol))
		errors.push(tr("validation.protocol"));
	for (const field of ["defaultContextWindow", "defaultMaxTokens"])
		if (owns(profile, field))
			numberError(
				profile[field],
				`field.${field}`,
				errors,
				1,
				Number.MAX_SAFE_INTEGER,
				true,
			);
	if (
		owns(profile, "defaultInput") &&
		(!Array.isArray(profile.defaultInput) ||
			profile.defaultInput.length === 0 ||
			profile.defaultInput.some((item) => !MODALITIES.includes(item)))
	)
		errors.push(tr("validation.modalitiesRequired"));
	if (
		owns(profile, "headers") &&
		(!isObject(profile.headers) ||
			Object.entries(profile.headers).some(
				([key, value]) =>
					key.trim().length === 0 || typeof value !== "string",
			))
	)
		errors.push(tr("validation.headers"));
	if (
		owns(profile, "reasoning") &&
		!THINKING_LEVELS.includes(profile.reasoning as ThinkingLevel)
	)
		errors.push(tr("validation.reasoning"));
	if (owns(profile, "thinkingBudgets")) {
		if (!isObject(profile.thinkingBudgets))
			errors.push(tr("validation.budgets"));
		else
			for (const [level, value] of Object.entries(
				profile.thinkingBudgets,
			)) {
				if (!BUDGET_LEVELS.includes(level as BudgetLevel))
					errors.push(tr("validation.budgetLevel", { level }));
				else
					numberError(
						value,
						`field.${level}`,
						errors,
						0,
						Number.MAX_SAFE_INTEGER,
						true,
					);
			}
	}
	if (
		owns(profile, "cacheRetention") &&
		!CACHE_RETENTIONS.includes(profile.cacheRetention as CacheRetention)
	)
		errors.push(tr("validation.cacheRetention"));
	if (
		owns(profile, "transport") &&
		!TRANSPORTS.includes(profile.transport as Transport)
	)
		errors.push(tr("validation.transport"));
	for (const field of ["timeoutMs", "websocketConnectTimeoutMs"])
		if (owns(profile, field))
			numberError(
				profile[field],
				`field.${field}`,
				errors,
				0,
				Number.MAX_SAFE_INTEGER,
				true,
			);
	if (owns(profile, "streamIdleTimeoutMs"))
		numberError(
			profile.streamIdleTimeoutMs,
			"field.streamIdleTimeoutMs",
			errors,
			Number.MIN_VALUE,
			MAX_TIMER_DELAY_MS,
			false,
		);
	if (owns(profile, "compat"))
		validateCompat(profile.compat, tr("field.compat"), errors);
	if (owns(profile, "retryPolicy"))
		errors.push(...validateRetryPolicy(profile.retryPolicy));
	if (owns(profile, "models")) {
		if (!Array.isArray(profile.models))
			errors.push(tr("validation.models"));
		else {
			const ids = new Set<string>();
			profile.models.forEach((entry, index) => {
				errors.push(
					...validateModel(
						entry,
						tr("modelIndex", { index: index + 1 }),
					),
				);
				if (isObject(entry) && typeof entry.id === "string") {
					if (ids.has(entry.id))
						errors.push(
							tr("validation.duplicateModel", { id: entry.id }),
						);
					ids.add(entry.id);
				}
			});
		}
	}
	if (owns(profile, "modelOverrides")) {
		if (!isObject(profile.modelOverrides))
			errors.push(tr("validation.overrides"));
		else
			for (const [id, entry] of Object.entries(profile.modelOverrides))
				errors.push(
					...validateModel(entry, tr("overrideId", { id }), false),
				);
	}
	if (owns(profile, "models") && owns(profile, "modelOverrides"))
		errors.push(tr("validation.catalogConflict"));
	return errors;
}

export function validateOfficialProfile(profile: unknown): string[] {
	const errors: string[] = [];
	if (!isObject(profile))
		return [tr("validation.object", { field: tr("official.title") })];
	if (
		owns(profile, "apiKeyEnv") &&
		!/^[A-Za-z_][A-Za-z0-9_]*$/.test(String(profile.apiKeyEnv))
	)
		errors.push(tr("validation.credentialRef"));
	if (
		owns(profile, "baseURL") &&
		(typeof profile.baseURL !== "string" ||
			profile.baseURL.trim().length === 0)
	)
		errors.push(tr("validation.invalid", { field: tr("field.baseURL") }));
	if (
		owns(profile, "thinking") &&
		!OFFICIAL_THINKING.includes(String(profile.thinking))
	)
		errors.push(tr("validation.invalid", { field: tr("field.thinking") }));
	if (
		owns(profile, "reasoningEffort") &&
		!OFFICIAL_REASONING.includes(String(profile.reasoningEffort))
	)
		errors.push(
			tr("validation.invalid", { field: tr("field.reasoningEffort") }),
		);
	for (const field of ["maxTokens", "defaultContextWindow"])
		if (owns(profile, field))
			numberError(
				profile[field],
				`field.${field}`,
				errors,
				1,
				Number.MAX_SAFE_INTEGER,
				true,
			);
	if (owns(profile, "streamIdleTimeoutMs"))
		numberError(
			profile.streamIdleTimeoutMs,
			"field.streamIdleTimeoutMs",
			errors,
			Number.MIN_VALUE,
			MAX_TIMER_DELAY_MS,
			false,
		);
	if (owns(profile, "models")) {
		if (!Array.isArray(profile.models))
			errors.push(tr("validation.models"));
		else
			profile.models.forEach((entry, index) => {
				if (
					!isObject(entry) ||
					typeof entry.id !== "string" ||
					entry.id.trim().length === 0
				)
					errors.push(tr("validation.modelId", { index: index + 1 }));
				for (const field of ["contextWindow", "maxTokens"])
					if (owns(entry, field))
						numberError(
							entry[field],
							`field.${field}`,
							errors,
							1,
							Number.MAX_SAFE_INTEGER,
							true,
						);
			});
	}
	if (owns(profile, "retryPolicy"))
		errors.push(...validateRetryPolicy(profile.retryPolicy));
	return errors;
}

export function initialEditorState(
	namespace: SettingsNamespaceView | undefined,
	path: string[],
): EditorState {
	const profile = clone<ProviderProfile>(
		(at(namespace?.value, path) || {}) as ProviderProfile,
	);
	const user = at(namespace?.user, path) || {};
	return {
		profile,
		explicit: Object.fromEntries(
			PROFILE_FIELDS.map((field) => [field, owns(user, field)]),
		),
	};
}

export function hasUserProfile(
	namespace: SettingsNamespaceView | undefined,
	path: string[],
): boolean {
	return isObject(at(namespace?.user, path));
}

export function buildProfileOps(
	path: string[],
	initial: EditorState,
	draft: ProviderProfile,
	explicit: Record<string, boolean>,
): SettingsPathOp[] {
	return PROFILE_FIELDS.flatMap((field): SettingsPathOp[] => {
		if (initial.explicit[field] && !explicit[field])
			return [{ op: "unset", path: [...path, field] }];
		if (
			explicit[field] &&
			(!initial.explicit[field] ||
				!equal(initial.profile[field], draft[field]))
		)
			return [
				{
					op: "set",
					path: [...path, field],
					value: clone(draft[field]),
				},
			];
		return [];
	});
}

export function groupProviderRows(
	rows: ProviderRow[],
	namespace: SettingsNamespaceView,
): { builtIn: ProviderRow[]; custom: ProviderRow[] } {
	const builtIn: ProviderRow[] = [];
	const custom: ProviderRow[] = [];
	for (const row of rows) {
		if (
			row.settingsNs !== SETTINGS_NS ||
			!hasUserProfile(namespace, row.settingsPath)
		)
			continue;
		const target = row.declared === true ? custom : builtIn;
		target.push({
			...row,
			configured: clone<ProviderProfile>(
				(at(namespace?.value, row.settingsPath) ||
					{}) as ProviderProfile,
			),
		});
	}
	return { builtIn, custom };
}

export function deleteProviderOps(row: ProviderRow): SettingsPathOp[] {
	if (
		row.userAdded !== true ||
		row.settingsNs !== SETTINGS_NS ||
		row.settingsPath.length !== 2 ||
		row.settingsPath[0] !== "providers"
	) {
		throw new Error(tr("validation.deleteOnlyUserAdded"));
	}
	return [{ op: "unset", path: [...row.settingsPath] }];
}
