window.__ModuleLoader__.load({
	id: "@local/dsh-advanced-model-editor",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react = require("react");
		react = __toESM(react, 1);
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		_deepseek_ai_dsh_client_ui_primitives = __toESM(_deepseek_ai_dsh_client_ui_primitives, 1);
		//#region src/client/api.ts
		/**
		* Creates a ModelApi adapter over DSH Typert Remote services.
		*
		* DSH 0.2.1 owns the settings document through `ctx.configForms` /
		* `ctx.settingsSchema`, so this adapter no longer exposes
		* `settings.describe` / `settings.mutate`: reads and writes ride the shared
		* mirror and its ordered write queue (see ./settings.ts). What remains here is
		* the provider directory and the two write faces the shared services do not
		* cover — credential records and endpoint interrogation.
		* @param ctx - Cordis client context providing ctx.remote.
		*/
		function createModelApi(ctx) {
			const remote = ctx.remote;
			return {
				llm: {
					async providers() {
						const [registeredRes, declaredRes] = await Promise.all([remote.llm.listProviders(), remote.llm.listConfigurableProviders()]);
						if (!registeredRes.ok) return { result: {
							ok: false,
							error: { message: registeredRes.error?.message || "Failed to list providers" }
						} };
						if (!declaredRes.ok) return { result: {
							ok: false,
							error: { message: declaredRes.error?.message || "Failed to list configurable providers" }
						} };
						const registered = registeredRes.value || [];
						const declared = declaredRes.value || [];
						const active = new Set(registered.map((p) => p.id));
						const declaredSet = new Set(declared.map((entry) => entry.provider));
						const providers = declared.map((entry) => ({
							provider: entry.provider,
							displayName: entry.displayName,
							settingsNs: entry.settingsNs,
							settingsPath: Array.isArray(entry.settingsPath) ? [...entry.settingsPath] : [],
							active: active.has(entry.provider),
							...entry.declared !== void 0 ? { declared: entry.declared } : {},
							...entry.defaultBaseURL !== void 0 ? { defaultBaseURL: entry.defaultBaseURL } : {},
							...entry.baseURLEnv !== void 0 ? { baseURLEnv: [...entry.baseURLEnv] } : {},
							...entry.nativeAuth !== void 0 ? { nativeAuth: {
								env: [...entry.nativeAuth.env || []],
								oauth: entry.nativeAuth.oauth === true
							} } : {},
							...entry.error !== void 0 ? { error: entry.error } : {}
						}));
						for (const provider of registered) {
							if (declaredSet.has(provider.id)) continue;
							providers.push({
								provider: provider.id,
								displayName: provider.name,
								settingsNs: "",
								settingsPath: [],
								active: true
							});
						}
						return { result: {
							ok: true,
							value: { providers }
						} };
					},
					async discoverModels(input) {
						const settingsNs = input?.settingsNs || "llm-pi-ai";
						const req = {};
						if (input?.provider) req.provider = input.provider;
						if (input?.baseURL) req.baseURL = input.baseURL;
						if (input?.api) req.api = input.api;
						if (input?.apiKey) req.apiKey = input.apiKey;
						const res = await remote.llm.discoverModels(settingsNs, req);
						if (!res.ok) return { result: {
							ok: false,
							error: { message: res.error?.message || "Failed to discover models" }
						} };
						return { result: {
							ok: true,
							value: { models: res.value }
						} };
					}
				},
				credentials: {
					async describe(input) {
						const refs = Array.isArray(input) ? input : [];
						const res = await remote.credentials.describe(refs);
						if (!res.ok) return { result: {
							ok: false,
							error: { message: res.error?.message || "Failed to describe credentials" }
						} };
						return { result: {
							ok: true,
							value: res.value
						} };
					},
					async set(input) {
						const res = await remote.credentials.set(input.ref, input.value);
						if (!res.ok) return { result: {
							ok: false,
							error: { message: res.error?.message || "Failed to set credential" }
						} };
						return { result: {
							ok: true,
							value: void 0
						} };
					},
					async unset(input) {
						const res = await remote.credentials.unset(input.ref);
						if (!res.ok) return { result: {
							ok: false,
							error: { message: res.error?.message || "Failed to unset credential" }
						} };
						return { result: {
							ok: true,
							value: void 0
						} };
					}
				}
			};
		}
		//#endregion
		//#region src/client/constants.ts
		const SETTINGS_NS = "llm-pi-ai";
		const OFFICIAL_NS = "llm-deepseek";
		const LOCALE_NS = "@local/dsh-advanced-model-editor";
		const PROFILE_FIELDS = [
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
			"maxRequestImageBytes",
			"requestImagePixelBudget",
			"requestImageMaxBytes",
			"retryPolicy"
		];
		const THINKING_LEVELS = [
			"off",
			"minimal",
			"low",
			"medium",
			"high",
			"xhigh",
			"max"
		];
		const BUDGET_LEVELS = [
			"minimal",
			"low",
			"medium",
			"high"
		];
		const MODALITIES = ["text", "image"];
		const THINKING_FORMATS = [
			"openai",
			"deepseek",
			"openrouter",
			"together",
			"baseten",
			"zai",
			"qwen",
			"chat-template",
			"qwen-chat-template",
			"string-thinking",
			"ant-ling"
		];
		const MAX_TOKENS_FIELDS = ["max_tokens", "max_completion_tokens"];
		const THINKING_TOKEN_BUDGET_FIELDS = [
			"thinking_token_budget",
			"thinking_budget",
			"thinking_budget_tokens"
		];
		const CACHE_CONTROL_FORMATS = ["anthropic"];
		const PROTOCOLS = [
			"openai-completions",
			"openai-responses",
			"anthropic-messages"
		];
		const TRANSPORTS = [
			"sse",
			"websocket",
			"websocket-cached",
			"auto"
		];
		const CACHE_RETENTIONS = [
			"none",
			"short",
			"long"
		];
		const OFFICIAL_THINKING = ["enabled", "disabled"];
		const OFFICIAL_REASONING = [
			"off",
			"low",
			"high",
			"max"
		];
		const TOOL_UPDATES = ["in-history", "addition-only"];
		const DEFAULT_RETRYABLE_CODES = [
			"EMPTY_RESPONSE",
			"RATE_LIMIT",
			"SERVER",
			"TIMEOUT",
			"TRANSPORT"
		];
		const MAX_TIMER_DELAY_MS = 2147483647;
		//#endregion
		//#region src/client/i18n.ts
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
		let translate = (key) => key;
		/**
		* Install the dictionary the plugin's locale binding resolves against.
		* @param next - translator for the registered locale namespace; a non-function
		*   replaces the current one with the identity translator.
		*/
		function setTranslator(next) {
			translate = typeof next === "function" ? next : (key) => key;
		}
		/**
		* Translate one dictionary key, interpolating `{name}` placeholders.
		* @param key - dictionary path; returned verbatim when the dictionary misses it.
		* @param vars - values substituted for `{name}` occurrences.
		* @returns the localized text.
		*/
		function tr(key, vars) {
			let value = translate(key);
			if (typeof value !== "string") value = key;
			if (vars) for (const [name, replacement] of Object.entries(vars)) value = value.replaceAll(`{${name}}`, String(replacement));
			return value;
		}
		//#endregion
		//#region src/client/settings.ts
		/**
		* Namespace view for one settings namespace, taken from the shared mirror.
		* @param describe - the shared describe face.
		* @param namespace - settings namespace id.
		* @returns the view, or undefined while unserved or before the first answer.
		*/
		function namespaceView(describe, namespace) {
			return describe.getSnapshot().view?.namespaces.find((view) => view.ns === namespace);
		}
		/**
		* Kick the first describe read when nothing holds an answer yet. Idempotent:
		* the mirror folds concurrent calls into one wire read.
		* @param describe - the shared describe face.
		*/
		function ensureDescribe(describe) {
			if (describe.getSnapshot().status === "idle") describe.ensure();
		}
		/**
		* Apply one ordered path-operation batch through the shared write queue. The
		* queue owns the revision fence and the recovery read, so a `false` answer
		* already means "the Host refused and the mirror was reloaded".
		* @param form - the namespace's shared form.
		* @param ops - ordered path operations.
		* @returns whether the Host accepted the batch.
		*/
		async function writeOps(form, ops) {
			if (ops.length === 0) return true;
			return await form.mutate(ops);
		}
		/**
		* The message shown when a queued write was refused. The shared queue has
		* already reloaded the document, so the draft is stale rather than corrupt.
		* @returns the localized conflict message.
		*/
		function conflictMessage() {
			return tr("validation.writeConflict");
		}
		/**
		* Read one object node's declared field names, in schema order.
		* @param schema - settings schema service.
		* @param view - the namespace view carrying the serialized schema.
		* @param path - path from the section root to the object node.
		* @returns the declared keys, or an empty list when the node is absent.
		*/
		function objectFields(schema, view, path) {
			if (view === void 0) return [];
			const node = schema.nodeAtPath(schema.rehydrate(view.schema), path);
			if (node === void 0 || node.type !== "object" || node.dict === void 0) return [];
			return Object.keys(node.dict);
		}
		/**
		* Read one union node's literal members, in declaration order.
		* @param schema - settings schema service.
		* @param view - the namespace view carrying the serialized schema.
		* @param path - path from the section root to the union node.
		* @returns the string members, or an empty list when the node is absent.
		*/
		function unionValues(schema, view, path) {
			if (view === void 0) return [];
			const node = schema.nodeAtPath(schema.rehydrate(view.schema), path);
			if (node === void 0 || node.type !== "union" || node.list === void 0) return [];
			return node.list.flatMap((member) => typeof member.value === "string" ? [member.value] : []);
		}
		/**
		* Read the key union of one dict node, in declaration order. A union wrapper
		* around the dict (the shape `reasoningEfforts` uses) is unwrapped first.
		* @param schema - settings schema service.
		* @param view - the namespace view carrying the serialized schema.
		* @param path - path from the section root to the dict (or its union).
		* @returns the declared keys, or an empty list when the node is absent.
		*/
		function dictKeys(schema, view, path) {
			if (view === void 0) return [];
			let node = schema.nodeAtPath(schema.rehydrate(view.schema), path);
			if (node?.type === "union") node = node.list?.find((member) => member.type === "dict");
			if (node?.type !== "dict") return [];
			return node.sKey?.list?.flatMap((member) => typeof member.value === "string" ? [member.value] : []) ?? [];
		}
		//#endregion
		//#region src/client/choices.ts
		/**
		* Live option and field sets derived from a namespace's own serialized schema.
		*
		* DSH 0.2.1 made the schema the single source for the choices a settings
		* surface offers: the official Models page reads the protocol union and the
		* reasoning-level key union out of `settings.describe` rather than keeping a
		* copy (see `protocolChoices` / `reasoningLevelChoices` there). This module
		* follows the same rule for the standalone page. The compiled-in constants
		* stay as the fallback for the moment before the first describe answer lands,
		* and as the documented field set the tests assert against.
		*/
		/** The route path used to reach one provider profile's schema node. */
		const PROBE_ROUTE = "\0probe";
		let protocols = PROTOCOLS;
		let reasoningLevels = THINKING_LEVELS;
		let profileFields = PROFILE_FIELDS;
		/** Wire protocols the route schema accepts, in declaration order. */
		function protocolChoices() {
			return protocols;
		}
		/** Reasoning levels the model schema accepts as `reasoningEfforts` keys. */
		function reasoningLevelChoices() {
			return reasoningLevels;
		}
		/** Fields the llm-pi-ai profile schema declares, in declaration order. */
		function profileFieldChoices() {
			return profileFields;
		}
		/**
		* Replace every derived set from the two namespace views. Called on each
		* describe update; an empty derivation keeps the previous set rather than
		* blanking the controls while a namespace is momentarily unreadable.
		* @param schema - settings schema service.
		* @param namespaces - the served namespace views by id.
		*/
		function adoptSchemaChoices(schema, namespaces) {
			const pi = namespaces.llmPiAi;
			const nextProtocols = unionValues(schema, pi, [
				"providers",
				PROBE_ROUTE,
				"api"
			]);
			if (nextProtocols.length > 0) protocols = nextProtocols;
			const nextLevels = dictKeys(schema, pi, [
				"providers",
				PROBE_ROUTE,
				"models",
				"0",
				"reasoningEfforts"
			]);
			if (nextLevels.length > 0) reasoningLevels = nextLevels;
			const nextProfile = objectFields(schema, pi, ["providers", PROBE_ROUTE]);
			if (nextProfile.length > 0) profileFields = nextProfile;
			if (objectFields(schema, namespaces.llmDeepSeek, []).length > 0);
		}
		/**
		* Seed a custom `reasoningEfforts` map with the levels the adapter currently
		* accepts, using each level's own wire spelling. Levels come from the
		* namespace schema, so a level the adapter drops stops being offered.
		*
		* This lives beside the level list it reads rather than in `utils.ts`, which is
		* what used to make `utils -> choices -> settings -> utils` a cycle.
		* @returns a fresh effort map keyed in escalation order.
		*/
		function createDefaultReasoningEfforts() {
			const result = {};
			for (const level of reasoningLevelChoices()) result[level] = level === "off" ? null : level;
			return result;
		}
		//#endregion
		//#region src/client/icon.ts
		/**
		* The plugin's mark, as SVG path data.
		*
		* One geometry serves both places the plugin draws itself: the package icon
		* (`icon.svg`, stroke gradient) and the settings nav glyph, which is stroked
		* with `currentColor` so the shell's own text colour decides the tint. Keeping
		* the path here — rather than duplicating it into the nav code — means the two
		* cannot drift.
		*/
		const MARK_PATH = "M12 11.65L9.58 10.25M2.25 9.19L2.25 8.06C2.25 6.93 2.25 6.36 2.51 5.9C2.78 5.44 3.27 5.16 4.25 4.6L5.05 4.13M2.25 13.89L2.25 15.02C2.25 16.14 2.25 16.71 2.51 17.17C2.78 17.64 3.27 17.92 4.25 18.48L5.05 18.94M21.75 9.19L21.75 8.06C21.75 6.93 21.75 6.36 21.49 5.9C21.22 5.44 20.73 5.16 19.75 4.6L18.95 4.13M14.89 2.68L13.91 2.12C12.93 1.55 12.44 1.27 11.91 1.27C11.37 1.27 10.88 1.55 9.91 2.12L9.1 2.58M14.89 21.05L13.91 21.62C12.93 22.18 12.44 22.46 11.91 22.46C11.37 22.46 10.88 22.18 9.91 21.62L9.11 21.16M21.75 13.89L21.75 15.02C21.75 16.14 21.75 16.71 21.49 17.17C21.22 17.64 20.73 17.92 19.75 18.48L18.95 18.94M5.43 7.75L2.73 6.2M5.43 15.24L2.73 16.8M18.57 7.75L21.27 6.19M18.57 15.24L21.27 16.8M12 11.65L14.42 10.25M12 14.2L12 11.65M12 4.85L12 1.73M12 21.82L12 18.71";
		/** Stroke width the mark is drawn at, in its own 24-unit view box. */
		const MARK_STROKE = 2.1;
		//#endregion
		//#region src/client/locales/zh.ts
		const zh = {
			nav: "模型高级配置",
			title: "模型高级配置",
			refresh: "刷新 Provider 配置",
			addBuiltIn: "添加提供方",
			addCustom: "添加自定义提供方",
			loading: "正在读取模型配置…",
			waiting: "正在等待模型适配器…",
			readOnly: "当前设置存储为只读，编辑控件已禁用。",
			builtInProviders: "内置模型提供商",
			customProviders: "自定义模型提供商",
			empty: "尚未配置 llm-pi-ai Provider。",
			modelIndex: "模型 {index}",
			overrideId: "模型覆盖 {id}",
			edit: "编辑",
			expand: "展开",
			collapse: "收起",
			cancel: "取消",
			apply: "应用",
			applying: "保存中…",
			reset: "撤销更改",
			confirmDelete: "确认删除",
			waitSeconds: "请等待 {seconds} 秒",
			customTag: "自定义",
			builtInTag: "内置",
			immutableTag: "内置 · 不可删除",
			deleteConfig: "删除将移除此 Provider 的配置。",
			deleteCredential: "删除将移除此 Provider 的配置，并清除已存储的 API 密钥引用 {ref}。若其他 Provider 也使用该引用，其密钥同样会被移除。",
			connection: "连接",
			capacityInput: "容量与输入",
			reasoningCache: "推理与缓存",
			transportTimeout: "传输与超时",
			headers: "请求头",
			retryPolicy: "重试策略",
			modelCatalog: "模型目录",
			catalogOverrides: "内置目录局部覆盖",
			catalogConflict: "自定义模型目录启用时，不能同时保存模型覆盖。",
			providerRetry: "Provider 重试策略",
			customHeaders: "自定义请求头",
			customModels: "自定义模型列表",
			modelOverrides: "模型覆盖",
			flowRetry: "流与重试",
			reasoningCapacity: "推理与容量",
			addProviderTitle: "添加提供方",
			addCustomTitle: "添加自定义提供方",
			builtInProvider: "内置提供方",
			noBuiltIn: "没有可添加的内置提供方。",
			adding: "添加中…",
			creating: "创建中…",
			routeId: "Provider ID",
			routeInvalid: "Provider ID 需以小写字母开头，只能包含小写字母、数字和短横线。",
			duplicateProvider: "该 Provider ID 已存在。",
			officialTitle: "DeepSeek 官方",
			apiKeyStatus: "API 密钥（{status}）",
			configured: "已配置",
			unconfigured: "未配置",
			field: {
				routeId: "Provider ID",
				builtInProvider: "内置提供方",
				models: "模型目录",
				retryPolicy: "重试策略",
				modelOverrides: "模型覆盖",
				apiKeyEnv: "凭据引用",
				apiKey: "API 密钥",
				api: "API 协议",
				baseURL: "API 地址",
				displayName: "显示名称",
				defaultContextWindow: "默认上下文窗口",
				defaultMaxTokens: "默认最大输出 token",
				defaultInput: "默认输入模态",
				reasoning: "默认推理档位",
				cacheRetention: "提示缓存保留",
				thinkingBudgets: "思考 token 预算",
				compat: "路由兼容性",
				transport: "流式传输",
				timeoutMs: "请求超时 ms",
				websocketConnectTimeoutMs: "WebSocket 连接超时 ms",
				streamIdleTimeoutMs: "流空闲超时 ms",
				thinking: "思考",
				reasoningEffort: "推理档位",
				maxTokens: "最大输出 token",
				contextWindow: "上下文窗口",
				name: "显示名称",
				description: "描述",
				id: "模型 ID",
				input: "输入模态",
				inputModalities: "输入模态",
				imagePixelBudget: "单图像素预算",
				imageMaxBytes: "单图最大字节",
				maxRequestImageBytes: "请求图片最大载荷（字节）",
				requestImagePixelBudget: "单图像素预算",
				requestImageMaxBytes: "单图最大字节",
				maxRequestFilesBytes: "请求文件最大字节",
				maxInlineRequestImageBytes: "内联图片最大字节",
				maxImagesPerRequest: "单请求最大图片数",
				imageOffloadByteQuantum: "文件图片移除步长（字节）",
				inlineImageOffloadByteQuantum: "内联图片移除步长（字节）",
				imageOffloadCountQuantum: "图片移除步长（张数）",
				filesApiTimeoutMs: "文件 API 超时 ms",
				fileExpiresAfterSeconds: "上传文件有效期（秒）",
				fileRefreshMarginSeconds: "文件提前刷新时间（秒）",
				fileQuotaCleanupBatch: "配额回收清理数量",
				headers: "请求头",
				reasoningEfforts: "推理档位映射",
				modelCompat: "模型兼容性",
				initialDelayMs: "初始延迟 ms",
				maxDelayMs: "最大延迟 ms",
				jitterRatio: "抖动比例",
				maxRetries: "最大重试次数",
				retryableCodes: "可重试错误码（逗号分隔）",
				low: "低",
				medium: "中",
				high: "高",
				minimal: "最小"
			},
			placeholder: {
				keepKey: "留空保持不变",
				credentialRef: "PROVIDER_API_KEY",
				providerId: "my-provider",
				displayName: "My Provider",
				officialBaseURL: "https://api.deepseek.com",
				apiKeyEnv: "PROVIDER_API_KEY",
				baseURL: "https://api.example.com/v1",
				deepseekURL: "https://api.deepseek.com",
				providerName: "My Provider",
				headerName: "请求头名称",
				headerValue: "请求头值",
				wireValue: "Wire 值",
				offWire: "留空表示仅支持关闭推理",
				contextWindow: "256K",
				maxTokens: "32K",
				defaultContextWindow: "256K",
				defaultMaxTokens: "32K",
				officialDefaultContextWindow: "1M",
				officialMaxTokens: "256K",
				imagePixelBudget: "640K 或 low",
				imageMaxBytes: "1M",
				requestImagePixelBudget: "4M",
				requestImageMaxBytes: "1M",
				maxRequestImageBytes: "20M",
				maxRequestFilesBytes: "128M",
				maxInlineRequestImageBytes: "20M",
				maxImagesPerRequest: "600",
				imageOffloadByteQuantum: "64M",
				inlineImageOffloadByteQuantum: "10M",
				imageOffloadCountQuantum: "20",
				filesApiTimeoutMs: "60000",
				fileExpiresAfterSeconds: "604800",
				fileRefreshMarginSeconds: "3600",
				fileQuotaCleanupBatch: "100"
			},
			text: "文本",
			image: "图片",
			unset: "未设置",
			auto: "自动检测",
			supported: "支持",
			unsupported: "不支持",
			inheritCatalog: "继承模型目录",
			disableReasoning: "禁用推理",
			customMapping: "自定义映射",
			none: "不保留",
			short: "短期",
			long: "长期",
			finiteRetry: "有限重试",
			alwaysRetry: "始终重试",
			addHeader: "添加请求头",
			addEffort: "添加推理档位",
			removeRow: "移除该行",
			addModel: "添加模型",
			removeModel: "移除模型",
			addOverride: "添加目录覆盖",
			discover: "获取可用模型",
			discoverTitle: "获取可用模型",
			discoverDescription: "从上游 API 获取模型列表。确认后将把选中的模型添加到现有模型配置，已有模型保持不变。",
			discoverOverwrite: "从上游 API 获取模型列表。当前已有 {count} 个模型，确认后将把选中的模型添加到现有模型配置。",
			discovering: "正在从上游 API 获取模型…",
			searchModels: "搜索模型 ID 或名称",
			selectFiltered: "全选当前过滤结果",
			existing: "已存在",
			chooseModels: "请选择模型",
			confirmModels: "确认添加 {count} 个模型",
			close: "关闭",
			validation: {
				number: "{field}无效。",
				object: "{field}必须为对象。",
				invalid: "{field}无效。",
				efforts: "推理档位映射必须为 false 或非空映射。",
				modelId: "{index}的模型 ID 无效。",
				modalities: "输入模态无效。",
				retry: "重试策略无效。",
				backoffOrder: "初始延迟不能大于最大延迟。",
				retryCodes: "可重试错误码必须为非空且不重复的字符串列表。",
				credentialRef: "凭据引用必须是有效的环境变量名。",
				protocol: "API 协议无效。",
				modalitiesRequired: "默认输入模态必须为非空列表。",
				headers: "请求头无效。",
				reasoning: "默认推理档位无效。",
				budgets: "思考 token 预算无效。",
				budgetLevel: "思考 token 预算不支持 {level}。",
				cacheRetention: "提示缓存保留选项无效。",
				transport: "流式传输选项无效。",
				models: "模型目录必须为数组。",
				duplicateModel: "模型 ID {id} 重复。",
				overrides: "模型覆盖必须为对象。",
				catalogConflict: "自定义模型目录与模型覆盖不能同时启用。",
				route: "Provider ID 需以小写字母开头，只能包含小写字母、数字和短横线。",
				duplicateProvider: "该 Provider ID 已存在。",
				noBuiltIn: "没有可添加的内置提供方。",
				quantumExceedsMax: "{field}不能超过对应的上限。",
				fileRefreshOrder: "文件提前刷新时间必须小于文件有效期。",
				textOnlyImageLimits: "纯文本模型不能设置图片参数。",
				thinkingDisabledReasoning: "禁用思考时推理档位只能为 off。",
				writeConflict: "配置已被其他编辑修改，已重新读取，请确认后重试。",
				json: "请输入合法的 JSON 对象。"
			},
			action: {
				delete: "删除",
				cancel: "取消",
				confirmDelete: "确认删除",
				collapse: "收起",
				edit: "编辑",
				expand: "展开",
				undo: "撤销更改",
				saving: "保存中…",
				apply: "应用",
				creating: "创建中…",
				createProvider: "添加自定义提供方",
				adding: "添加中…",
				addProvider: "添加提供方"
			},
			credential: {
				label: "API 密钥（{status}）",
				configured: "已配置",
				notConfigured: "未配置",
				nativeConfigured: "原生认证 · {refs} 已设置",
				nativeOAuth: "原生认证 · 可用 OAuth 登录",
				nativeMissing: "原生认证 · 未检测到 {refs}",
				nativeNone: "原生认证 · 无需密钥"
			},
			delete: {
				withCredential: "删除将移除此 Provider 的配置，并清除已存储的 API 密钥引用 {ref}。若其他 Provider 也使用该引用，其密钥同样会被移除。",
				providerOnly: "删除将移除此 Provider 的配置。"
			},
			group: {
				connection: "连接",
				capacity: "容量与输入",
				reasoning: "推理与缓存",
				transport: "传输与超时",
				overrides: "内置目录局部覆盖",
				officialReasoning: "推理与容量",
				models: "模型目录",
				vision: "视觉与文件",
				flowRetry: "流与重试"
			},
			option: {
				thinking: {
					off: "关闭",
					minimal: "最小",
					low: "低",
					medium: "中",
					high: "高",
					xhigh: "超高",
					max: "最大",
					enabled: "启用",
					disabled: "禁用"
				},
				cache: {
					none: "不保留",
					short: "短期",
					long: "长期"
				},
				transport: {
					sse: "SSE",
					websocket: "WebSocket",
					"websocket-cached": "WebSocket 缓存",
					auto: "自动"
				}
			},
			provider: {
				label: "Provider",
				custom: "自定义",
				builtIn: "内置"
			},
			custom: { title: "添加自定义提供方" },
			builtin: { title: "添加提供方" },
			official: {
				title: "DeepSeek 官方",
				fixed: "内置 · 不可删除"
			},
			controls: {
				field: { override: "{label}：覆盖继承值" },
				select: {
					unset: "未设置",
					auto: "自动检测"
				},
				protocol: {
					label: "API 协议",
					"openai-completions": "OpenAI Completions",
					"openai-responses": "OpenAI Responses",
					"anthropic-messages": "Anthropic Messages"
				},
				modality: {
					text: "文本",
					image: "图片"
				},
				reasoningLevel: {
					off: "关闭",
					minimal: "最小",
					low: "低",
					medium: "中",
					high: "高",
					xhigh: "超高",
					max: "最大"
				},
				keyValue: {
					remove: "移除该行",
					headers: {
						keyPlaceholder: "请求头名称",
						valuePlaceholder: "请求头值",
						add: "添加请求头"
					},
					efforts: {
						valuePlaceholder: "Wire 值",
						offValuePlaceholder: "留空表示仅支持关闭推理",
						add: "添加推理档位"
					}
				},
				compat: {
					title: "兼容性设置",
					configuredCount: "已配置 {count} 项",
					thinkingFormat: "思考格式",
					supportsReasoningEffort: "reasoning_effort 参数支持",
					supportsDeveloperRole: "developer 角色支持",
					supportsStore: "store 参数支持",
					supportsUsageInStreaming: "流式 usage 统计支持",
					supportsFinishReason: "流式 finish_reason 支持",
					maxTokensField: "输出上限字段",
					requiresToolResultName: "工具结果必须带 name",
					requiresAssistantAfterToolResult: "工具结果后必须跟 assistant 消息",
					requiresThinkingAsText: "思考内容必须以文本标签传输",
					requiresReasoningContentOnAssistantMessages: "回放消息必须带 reasoning_content",
					supportsThinkingTokenBudget: "thinking_token_budget 思考预算支持",
					thinkingTokenBudgetField: "思考预算字段名",
					vllmPriority: "vLLM 调度优先级",
					vllmPriorityPlaceholder: "例如 0（整数，越小优先级越高）",
					supportsStrictMode: "严格工具模式 (strict) 支持",
					supportsMaxOutputTokens: "max_output_tokens 参数支持",
					cacheControlFormat: "Prompt Cache 标记格式",
					supportsLongCacheRetention: "长期提示词缓存支持",
					supportsEagerToolInputStreaming: "逐工具输入流式传输支持",
					supportsCacheControlOnTools: "工具定义 cache_control 支持",
					supportsTemperature: "temperature 参数支持",
					forceAdaptiveThinking: "强制开启自适应思考",
					allowEmptySignature: "允许空思考签名",
					supportsStrictTools: "严格工具 Schema 支持",
					chatTemplateKwargs: "Chat 模板关键字参数",
					chatTemplateKwargsPlaceholder: "{\"enable_thinking\": {\"$var\": \"thinking.enabled\"}}",
					chatTemplateArgs: "Chat 模板参数",
					chatTemplateArgsPlaceholder: "{\"thinking_budget\": {\"$var\": \"thinking.budget\"}}"
				},
				thinkingFormat: {
					openai: "OpenAI",
					deepseek: "DeepSeek",
					openrouter: "OpenRouter",
					together: "Together",
					baseten: "Baseten",
					zai: "ZAI",
					qwen: "Qwen",
					"chat-template": "Chat Template",
					"qwen-chat-template": "Qwen Chat Template",
					"string-thinking": "String thinking",
					"ant-ling": "Ant Ling"
				},
				maxTokensField: {
					max_tokens: "max_tokens",
					max_completion_tokens: "max_completion_tokens"
				},
				thinkingTokenBudgetField: {
					thinking_token_budget: "thinking_token_budget",
					thinking_budget: "thinking_budget",
					thinking_budget_tokens: "thinking_budget_tokens"
				},
				cacheControlFormat: { anthropic: "Anthropic" },
				boolean: {
					supported: "支持",
					unsupported: "不支持"
				},
				retry: {
					modeLabel: "重试模式",
					mode: {
						normal: "有限重试",
						always: "始终重试"
					},
					maxRetries: "最大重试次数",
					retryableCodes: "可重试错误码（逗号分隔）",
					initialDelayMs: "初始延迟 ms",
					maxDelayMs: "最大延迟 ms",
					jitterRatio: "抖动比例"
				}
			},
			models: {
				field: {
					id: "模型 ID",
					name: "显示名称",
					description: "描述",
					contextWindow: "上下文窗口",
					maxTokens: "最大输出 token",
					input: "输入模态",
					inputModalities: "输入模态",
					imagePixelBudget: "单图像素预算",
					imageMaxBytes: "单图最大字节",
					systemPromptUpdate: "系统提示词更新方式",
					toolUpdate: "工具列表更新方式",
					reasoningEfforts: "推理档位映射",
					compat: "模型兼容性"
				},
				systemPromptUpdate: {
					default: "默认（首条生效）",
					inHistory: "最新条生效（in-history）"
				},
				toolUpdate: {
					default: "默认（每次请求完整工具列表）",
					inHistory: "in-history（按序读取移除）",
					additionOnly: "仅新增（addition-only / defer_loading）"
				},
				reasoning: {
					inherit: "继承模型目录",
					disabled: "禁用推理",
					custom: "自定义映射",
					customCount: "自定义 ({count} 档)"
				},
				discovery: {
					cancel: "取消",
					confirm: "确认添加 {count} 个模型",
					pickRequired: "请选择模型",
					title: "获取可用模型",
					close: "关闭",
					description: "从上游 API 获取模型列表。确认后将把选中的模型添加到现有模型配置，已有模型保持不变。",
					loading: "正在从上游 API 获取模型…",
					searchPlaceholder: "搜索模型 ID 或名称",
					searchLabel: "搜索模型",
					selectFiltered: "全选当前过滤结果",
					existing: "已存在",
					contextWindow: "上下文 {value}",
					maxTokens: "输出上限 {value}",
					inputModalities: "输入：{value}",
					open: "获取可用模型"
				},
				override: { idPlaceholder: "内置模型 ID" },
				item: { fallback: "模型 {index}" },
				action: {
					clone: "克隆模型",
					remove: "移除模型",
					addOverride: "添加目录覆盖",
					add: "添加模型"
				}
			}
		};
		//#endregion
		//#region src/client/locales/en.ts
		const en = {
			nav: "Advanced Model Configuration",
			title: "Advanced Model Configuration",
			refresh: "Refresh provider settings",
			addBuiltIn: "Add provider",
			addCustom: "Add custom provider",
			loading: "Loading model settings…",
			waiting: "Waiting for model adapters…",
			readOnly: "Settings storage is read-only. Editing is disabled.",
			builtInProviders: "Built-in model providers",
			customProviders: "Custom model providers",
			empty: "No llm-pi-ai providers are configured.",
			modelIndex: "Model {index}",
			overrideId: "Model override {id}",
			edit: "Edit",
			expand: "Expand",
			collapse: "Collapse",
			cancel: "Cancel",
			apply: "Apply",
			applying: "Saving…",
			reset: "Discard changes",
			confirmDelete: "Confirm delete",
			waitSeconds: "Wait {seconds}s",
			customTag: "Custom",
			builtInTag: "Built-in",
			immutableTag: "Built-in · cannot delete",
			deleteConfig: "Deleting removes this provider configuration.",
			deleteCredential: "Deleting removes this provider configuration and stored API key reference {ref}. Other providers sharing it will lose the key too.",
			connection: "Connection",
			capacityInput: "Capacity and input",
			reasoningCache: "Reasoning and cache",
			transportTimeout: "Transport and timeouts",
			headers: "Headers",
			retryPolicy: "Retry policy",
			modelCatalog: "Model catalog",
			catalogOverrides: "Built-in catalog overrides",
			catalogConflict: "A custom model catalog and model overrides cannot be enabled together.",
			providerRetry: "Provider retry policy",
			customHeaders: "Custom headers",
			customModels: "Custom model list",
			modelOverrides: "Model overrides",
			flowRetry: "Stream and retry",
			reasoningCapacity: "Reasoning and capacity",
			addProviderTitle: "Add provider",
			addCustomTitle: "Add custom provider",
			builtInProvider: "Built-in provider",
			noBuiltIn: "No built-in providers are available to add.",
			adding: "Adding…",
			creating: "Creating…",
			routeId: "Provider ID",
			routeInvalid: "Provider ID must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens.",
			duplicateProvider: "This Provider ID already exists.",
			officialTitle: "DeepSeek Official",
			apiKeyStatus: "API key ({status})",
			configured: "configured",
			unconfigured: "not configured",
			field: {
				routeId: "Provider ID",
				builtInProvider: "Built-in provider",
				models: "Model catalog",
				retryPolicy: "Retry policy",
				modelOverrides: "Model overrides",
				apiKeyEnv: "Credential reference",
				apiKey: "API key",
				api: "API protocol",
				baseURL: "API URL",
				displayName: "Display name",
				defaultContextWindow: "Default context window",
				defaultMaxTokens: "Default max output tokens",
				defaultInput: "Default input modalities",
				reasoning: "Default reasoning level",
				cacheRetention: "Prompt cache retention",
				thinkingBudgets: "Thinking token budgets",
				compat: "Route compatibility",
				transport: "Streaming transport",
				timeoutMs: "Request timeout (ms)",
				websocketConnectTimeoutMs: "WebSocket connect timeout (ms)",
				streamIdleTimeoutMs: "Stream idle timeout (ms)",
				thinking: "Thinking",
				reasoningEffort: "Reasoning effort",
				maxTokens: "Max output tokens",
				contextWindow: "Context window",
				name: "Display name",
				description: "Description",
				id: "Model ID",
				input: "Input modalities",
				inputModalities: "Input modalities",
				imagePixelBudget: "Image pixel budget",
				imageMaxBytes: "Image max bytes",
				maxRequestImageBytes: "Max request image bytes",
				requestImagePixelBudget: "Request image pixel budget",
				requestImageMaxBytes: "Request image max bytes",
				maxRequestFilesBytes: "Max request files bytes",
				maxInlineRequestImageBytes: "Max inline request image bytes",
				maxImagesPerRequest: "Max images per request",
				imageOffloadByteQuantum: "Image offload byte quantum",
				inlineImageOffloadByteQuantum: "Inline image offload byte quantum",
				imageOffloadCountQuantum: "Image offload count quantum",
				filesApiTimeoutMs: "Files API timeout (ms)",
				fileExpiresAfterSeconds: "File expiry (seconds)",
				fileRefreshMarginSeconds: "File refresh margin (seconds)",
				fileQuotaCleanupBatch: "File quota cleanup batch",
				headers: "Headers",
				reasoningEfforts: "Reasoning effort mapping",
				modelCompat: "Model compatibility",
				initialDelayMs: "Initial delay (ms)",
				maxDelayMs: "Max delay (ms)",
				jitterRatio: "Jitter ratio",
				maxRetries: "Max retries",
				retryableCodes: "Retryable codes (comma-separated)",
				low: "Low",
				medium: "Medium",
				high: "High",
				minimal: "Minimal"
			},
			placeholder: {
				keepKey: "Leave blank to keep unchanged",
				credentialRef: "PROVIDER_API_KEY",
				providerId: "my-provider",
				displayName: "My Provider",
				officialBaseURL: "https://api.deepseek.com",
				apiKeyEnv: "PROVIDER_API_KEY",
				baseURL: "https://api.example.com/v1",
				deepseekURL: "https://api.deepseek.com",
				providerName: "My Provider",
				headerName: "Header name",
				headerValue: "Header value",
				wireValue: "Wire value",
				offWire: "Blank means off is supported",
				contextWindow: "256K",
				maxTokens: "32K",
				defaultContextWindow: "256K",
				defaultMaxTokens: "32K",
				officialDefaultContextWindow: "1M",
				officialMaxTokens: "256K",
				imagePixelBudget: "640K or low",
				imageMaxBytes: "1M",
				requestImagePixelBudget: "4M",
				requestImageMaxBytes: "1M",
				maxRequestImageBytes: "20M",
				maxRequestFilesBytes: "128M",
				maxInlineRequestImageBytes: "20M",
				maxImagesPerRequest: "600",
				imageOffloadByteQuantum: "64M",
				inlineImageOffloadByteQuantum: "10M",
				imageOffloadCountQuantum: "20",
				filesApiTimeoutMs: "60000",
				fileExpiresAfterSeconds: "604800",
				fileRefreshMarginSeconds: "3600",
				fileQuotaCleanupBatch: "100"
			},
			text: "Text",
			image: "Image",
			unset: "Not set",
			auto: "Auto-detect",
			supported: "Supported",
			unsupported: "Unsupported",
			inheritCatalog: "Inherit model catalog",
			disableReasoning: "Disable reasoning",
			customMapping: "Custom mapping",
			none: "None",
			short: "Short",
			long: "Long",
			finiteRetry: "Limited retries",
			alwaysRetry: "Always retry",
			addHeader: "Add header",
			addEffort: "Add reasoning level",
			removeRow: "Remove row",
			addModel: "Add model",
			removeModel: "Remove model",
			addOverride: "Add catalog override",
			discover: "Fetch available models",
			discoverTitle: "Fetch available models",
			discoverDescription: "Fetch models from the upstream API. Confirming adds the selected models to the current model list; existing models are left unchanged.",
			discoverOverwrite: "Fetch models from the upstream API. {count} models already exist; confirming adds the selected models to the current model list.",
			discovering: "Fetching models from the upstream API…",
			searchModels: "Search model ID or name",
			selectFiltered: "Select all filtered results",
			existing: "Existing",
			chooseModels: "Select models",
			confirmModels: "Add {count} models",
			close: "Close",
			validation: {
				number: "{field} is invalid.",
				object: "{field} must be an object.",
				invalid: "{field} is invalid.",
				efforts: "Reasoning efforts must be false or a non-empty map.",
				modelId: "{index} has an invalid model ID.",
				modalities: "Input modalities are invalid.",
				retry: "Retry policy is invalid.",
				backoffOrder: "Initial delay cannot exceed max delay.",
				retryCodes: "Retryable codes must be non-empty, unique strings.",
				credentialRef: "Credential reference must be a valid environment variable name.",
				protocol: "API protocol is invalid.",
				modalitiesRequired: "Default input modalities must be non-empty.",
				headers: "Headers are invalid.",
				reasoning: "Default reasoning level is invalid.",
				budgets: "Thinking budgets are invalid.",
				budgetLevel: "Thinking budgets do not support {level}.",
				cacheRetention: "Cache retention is invalid.",
				transport: "Transport is invalid.",
				models: "Model catalog must be an array.",
				duplicateModel: "Model ID {id} is duplicated.",
				overrides: "Model overrides must be an object.",
				catalogConflict: "Custom models and model overrides cannot both be enabled.",
				route: "Provider ID must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens.",
				duplicateProvider: "This Provider ID already exists.",
				noBuiltIn: "No built-in providers are available to add.",
				quantumExceedsMax: "{field} cannot exceed its corresponding limit.",
				fileRefreshOrder: "File refresh margin must be less than file expiry.",
				textOnlyImageLimits: "Text-only models cannot declare image parameters.",
				thinkingDisabledReasoning: "Reasoning effort must be off when thinking is disabled.",
				writeConflict: "This configuration changed elsewhere. It has been reloaded; review and retry.",
				json: "Enter a valid JSON object."
			},
			action: {
				delete: "Delete",
				cancel: "Cancel",
				confirmDelete: "Confirm delete",
				collapse: "Collapse",
				edit: "Edit",
				expand: "Expand",
				undo: "Discard changes",
				saving: "Saving…",
				apply: "Apply",
				creating: "Creating…",
				createProvider: "Add custom provider",
				adding: "Adding…",
				addProvider: "Add provider"
			},
			credential: {
				label: "API key ({status})",
				configured: "configured",
				notConfigured: "not configured",
				nativeConfigured: "native auth · {refs} set",
				nativeOAuth: "native auth · OAuth sign-in available",
				nativeMissing: "native auth · {refs} not detected",
				nativeNone: "native auth · no key required"
			},
			delete: {
				withCredential: "Deleting removes this provider configuration and stored API key reference {ref}. Other providers sharing it will lose the key too.",
				providerOnly: "Deleting removes this provider configuration."
			},
			group: {
				connection: "Connection",
				capacity: "Capacity and input",
				reasoning: "Reasoning and cache",
				transport: "Transport and timeouts",
				overrides: "Built-in catalog overrides",
				officialReasoning: "Reasoning and capacity",
				models: "Model catalog",
				vision: "Vision and files",
				flowRetry: "Stream and retry"
			},
			option: {
				thinking: {
					off: "Off",
					minimal: "Minimal",
					low: "Low",
					medium: "Medium",
					high: "High",
					xhigh: "Extra high",
					max: "Max",
					enabled: "Enabled",
					disabled: "Disabled"
				},
				cache: {
					none: "None",
					short: "Short",
					long: "Long"
				},
				transport: {
					sse: "SSE",
					websocket: "WebSocket",
					"websocket-cached": "WebSocket cached",
					auto: "Auto"
				}
			},
			provider: {
				label: "Provider",
				custom: "Custom",
				builtIn: "Built-in"
			},
			custom: { title: "Add custom provider" },
			builtin: { title: "Add provider" },
			official: {
				title: "DeepSeek Official",
				fixed: "Built-in · cannot delete"
			},
			controls: {
				field: { override: "{label}: override inherited value" },
				select: {
					unset: "Not set",
					auto: "Auto-detect"
				},
				protocol: {
					label: "API protocol",
					"openai-completions": "OpenAI Completions",
					"openai-responses": "OpenAI Responses",
					"anthropic-messages": "Anthropic Messages"
				},
				modality: {
					text: "Text",
					image: "Image"
				},
				reasoningLevel: {
					off: "Off",
					minimal: "Minimal",
					low: "Low",
					medium: "Medium",
					high: "High",
					xhigh: "Extra high",
					max: "Max"
				},
				keyValue: {
					remove: "Remove row",
					headers: {
						keyPlaceholder: "Header name",
						valuePlaceholder: "Header value",
						add: "Add header"
					},
					efforts: {
						valuePlaceholder: "Wire value",
						offValuePlaceholder: "Blank means off is supported",
						add: "Add reasoning level"
					}
				},
				compat: {
					title: "Compatibility settings",
					configuredCount: "{count} configured",
					thinkingFormat: "Thinking format",
					supportsReasoningEffort: "reasoning_effort support",
					supportsDeveloperRole: "developer role support",
					supportsStore: "store parameter support",
					supportsUsageInStreaming: "Stream usage tracking support",
					supportsFinishReason: "Stream finish_reason support",
					maxTokensField: "Max tokens field",
					requiresToolResultName: "Tool results require name",
					requiresAssistantAfterToolResult: "Assistant message required after tool result",
					requiresThinkingAsText: "Thinking content required as text",
					requiresReasoningContentOnAssistantMessages: "reasoning_content required on replayed messages",
					supportsThinkingTokenBudget: "thinking_token_budget support",
					thinkingTokenBudgetField: "Thinking token budget field",
					vllmPriority: "vLLM scheduler priority",
					vllmPriorityPlaceholder: "e.g. 0 (integer, lower runs earlier)",
					supportsStrictMode: "Strict tool mode support",
					supportsMaxOutputTokens: "max_output_tokens support",
					cacheControlFormat: "Prompt cache marker format",
					supportsLongCacheRetention: "Long cache retention support",
					supportsEagerToolInputStreaming: "Eager tool input streaming support",
					supportsCacheControlOnTools: "Cache control on tools support",
					supportsTemperature: "temperature parameter support",
					forceAdaptiveThinking: "Force adaptive thinking",
					allowEmptySignature: "Allow empty thinking signature",
					supportsStrictTools: "Strict tools support",
					chatTemplateKwargs: "Chat template kwargs",
					chatTemplateKwargsPlaceholder: "{\"enable_thinking\": {\"$var\": \"thinking.enabled\"}}",
					chatTemplateArgs: "Chat template args",
					chatTemplateArgsPlaceholder: "{\"thinking_budget\": {\"$var\": \"thinking.budget\"}}"
				},
				thinkingFormat: {
					openai: "OpenAI",
					deepseek: "DeepSeek",
					openrouter: "OpenRouter",
					together: "Together",
					baseten: "Baseten",
					zai: "ZAI",
					qwen: "Qwen",
					"chat-template": "Chat Template",
					"qwen-chat-template": "Qwen Chat Template",
					"string-thinking": "String thinking",
					"ant-ling": "Ant Ling"
				},
				maxTokensField: {
					max_tokens: "max_tokens",
					max_completion_tokens: "max_completion_tokens"
				},
				thinkingTokenBudgetField: {
					thinking_token_budget: "thinking_token_budget",
					thinking_budget: "thinking_budget",
					thinking_budget_tokens: "thinking_budget_tokens"
				},
				cacheControlFormat: { anthropic: "Anthropic" },
				boolean: {
					supported: "Supported",
					unsupported: "Unsupported"
				},
				retry: {
					modeLabel: "Retry mode",
					mode: {
						normal: "Limited retries",
						always: "Always retry"
					},
					maxRetries: "Max retries",
					retryableCodes: "Retryable codes (comma-separated)",
					initialDelayMs: "Initial delay (ms)",
					maxDelayMs: "Max delay (ms)",
					jitterRatio: "Jitter ratio"
				}
			},
			models: {
				field: {
					id: "Model ID",
					name: "Display name",
					description: "Description",
					contextWindow: "Context window",
					maxTokens: "Max output tokens",
					input: "Input modalities",
					inputModalities: "Input modalities",
					imagePixelBudget: "Image pixel budget",
					imageMaxBytes: "Image max bytes",
					systemPromptUpdate: "System prompt update",
					toolUpdate: "Tool update mode",
					reasoningEfforts: "Reasoning effort mapping",
					compat: "Model compatibility"
				},
				systemPromptUpdate: {
					default: "Default (first system message)",
					inHistory: "Latest message (in-history)"
				},
				toolUpdate: {
					default: "Default (full tool list every request)",
					inHistory: "In-history (removals applied)",
					additionOnly: "Addition-only (defer_loading)"
				},
				reasoning: {
					inherit: "Inherit model catalog",
					disabled: "Disable reasoning",
					custom: "Custom mapping",
					customCount: "Custom ({count} levels)"
				},
				discovery: {
					cancel: "Cancel",
					confirm: "Add {count} models",
					pickRequired: "Select models",
					title: "Fetch available models",
					close: "Close",
					description: "Fetch models from the upstream API. Confirming adds the selected models to the current model list; existing models are left unchanged.",
					loading: "Fetching models from the upstream API…",
					searchPlaceholder: "Search model ID or name",
					searchLabel: "Search models",
					selectFiltered: "Select all filtered results",
					existing: "Existing",
					contextWindow: "Context {value}",
					maxTokens: "Output cap {value}",
					inputModalities: "Input: {value}",
					open: "Fetch available models"
				},
				override: { idPlaceholder: "Built-in model ID" },
				item: { fallback: "Model {index}" },
				action: {
					clone: "Clone model",
					remove: "Remove model",
					addOverride: "Add catalog override",
					add: "Add model"
				}
			}
		};
		//#endregion
		//#region src/client/locales/index.ts
		function flattenDictionary(source, prefix = "", result = {}) {
			for (const [key, value] of Object.entries(source)) {
				const path = prefix ? `${prefix}.${key}` : key;
				if (value !== null && typeof value === "object" && !Array.isArray(value)) flattenDictionary(value, path, result);
				else result[path] = String(value);
			}
			return result;
		}
		//#endregion
		//#region src/client/credential-status.ts
		/**
		* Describe the credential posture of one route.
		*
		* DSH 0.2.1 exposes the authentication a route performs without any profile
		* credential (`nativeAuth`), so a keyless route must not read as "missing a
		* key": its environment references and OAuth availability are the real answer.
		* This lives outside the control that renders it because the policy is the part
		* with branches worth testing, and a control file cannot be imported without a
		* React runtime.
		* @param nativeAuth - the route's native authentication, when it declares one.
		* @param checks - redacted state per environment reference.
		* @param hasNamedRef - whether the profile names an `apiKeyEnv` itself.
		* @param namedRef - the reference the profile names, or the derived default.
		* @returns the status text shown beside the key input.
		*/
		function credentialStatus(nativeAuth, checks, hasNamedRef, namedRef) {
			if (hasNamedRef || nativeAuth === void 0) return checks?.[namedRef]?.configured === true ? tr("credential.configured") : tr("credential.notConfigured");
			const present = nativeAuth.env.filter((name) => checks?.[name]?.configured === true);
			if (present.length > 0) return tr("credential.nativeConfigured", { refs: present.join(", ") });
			if (nativeAuth.oauth) return tr("credential.nativeOAuth");
			if (nativeAuth.env.length === 0) return tr("credential.nativeNone");
			return tr("credential.nativeMissing", { refs: nativeAuth.env.join(", ") });
		}
		/**
		* Merge the page's batched checks with one field's own single-reference read.
		* The field wins for its own reference: it read that value most recently.
		* @param checks - checks the page batched.
		* @param keyRef - the reference this field asked about.
		* @param own - the field's own read, when it has one.
		* @returns the merged map.
		*/
		function mergeCredentialChecks(checks, keyRef, own) {
			const merged = { ...checks ?? {} };
			if (own !== void 0) merged[keyRef] = own;
			return merged;
		}
		//#endregion
		//#region src/client/controls/field.ts
		const e$16 = react.createElement;
		function Field(props) {
			const label = tr(props.labelKey, props.labelVars);
			return e$16("div", { className: "dsh-ma-field" + (props.wide ? " dsh-ma-wide" : "") }, e$16("div", { className: "dsh-ma-field-label" }, props.onEnabled ? e$16("input", {
				className: "dsh-ma-override",
				type: "checkbox",
				checked: props.enabled === true,
				disabled: props.readOnly === true,
				"aria-label": tr("controls.field.override", { label }),
				onChange: (event) => props.onEnabled?.(event.target.checked)
			}) : null, e$16("span", null, label)), props.children);
		}
		//#endregion
		//#region src/client/utils.ts
		/** Accepted capacity spellings: a decimal count with an optional unit suffix. */
		const CAPACITY_PATTERN = /^(\d+(?:\.\d+)?)\s*([kmgtb]|kib|mib|gib|tib|kb|mb|gb|tb|ki|mi|gi|ti)?$/i;
		const DECIMAL_SCALES = {
			k: 1e3,
			kb: 1e3,
			m: 1e6,
			mb: 1e6,
			g: 1e9,
			gb: 1e9,
			b: 1e9,
			t: 0xe8d4a51000,
			tb: 0xe8d4a51000
		};
		const BINARY_SCALES = {
			ki: 1024,
			kib: 1024,
			mi: 1048576,
			mib: 1048576,
			gi: 1073741824,
			gib: 1073741824,
			ti: 1099511627776,
			tib: 1099511627776
		};
		/**
		* Read a typed capacity, so a user can write `256K`, `1M`, `128MiB`, `20MB` etc.
		* instead of counting zeroes. The stored value stays a plain number.
		* @param text - raw field text.
		* @returns the count; `undefined` when blank (inherit), `NaN` when unreadable
		*   (rejected by validation before any write).
		*/
		function parseCapacity(text) {
			const trimmed = text.trim();
			if (trimmed.length === 0) return void 0;
			const match = CAPACITY_PATTERN.exec(trimmed);
			if (match === null) return NaN;
			const suffix = match[2]?.toLowerCase();
			let scale = 1;
			if (suffix) {
				if (suffix in BINARY_SCALES) scale = BINARY_SCALES[suffix];
				else if (suffix in DECIMAL_SCALES) scale = DECIMAL_SCALES[suffix];
			}
			const scaled = Number(match[1]) * scale;
			const rounded = Math.round(scaled);
			return Math.abs(scaled - rounded) < 1e-6 ? rounded : scaled;
		}
		/**
		* Spell a stored count back in the shortest form that survives a round trip
		* through {@link parseCapacity}; a count that is not a whole number of
		* units stays written out.
		* @param value - stored capacity.
		* @returns the field text.
		*/
		function formatCapacity(value) {
			if (!Number.isInteger(value) || value <= 0) return String(value);
			if (value % 0xe8d4a51000 === 0) return `${String(value / 0xe8d4a51000)}T`;
			if (value % 1e9 === 0) return `${String(value / 1e9)}G`;
			if (value % 1e6 === 0) return `${String(value / 1e6)}M`;
			if (value % 1e3 === 0) return `${String(value / 1e3)}K`;
			if (value % 1099511627776 === 0) return `${String(value / 1099511627776)}Ti`;
			if (value % 1073741824 === 0) return `${String(value / 1073741824)}Gi`;
			if (value % 1048576 === 0) return `${String(value / 1048576)}Mi`;
			if (value % 1024 === 0) return `${String(value / 1024)}Ki`;
			return String(value);
		}
		function isObject(value) {
			return value !== null && typeof value === "object" && !Array.isArray(value);
		}
		function owns(value, key) {
			return isObject(value) && Object.prototype.hasOwnProperty.call(value, key);
		}
		function clone(value) {
			if (Array.isArray(value)) return value.map((item) => clone(item));
			if (isObject(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
			return value;
		}
		function equal(left, right) {
			if (left === right) return true;
			if (Array.isArray(left) || Array.isArray(right)) return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((item, index) => equal(item, right[index]));
			if (!isObject(left) || !isObject(right)) return false;
			const keys = Object.keys(left);
			return keys.length === Object.keys(right).length && keys.every((key) => owns(right, key) && equal(left[key], right[key]));
		}
		function at(source, path) {
			let current = source;
			for (const part of path) {
				if (!isObject(current) || !owns(current, part)) return void 0;
				current = current[part];
			}
			return current;
		}
		function setIn(source, field, value) {
			const next = clone(source);
			if (value === void 0) delete next[field];
			else next[field] = clone(value);
			return next;
		}
		function valueOf(response) {
			if (!response.result.ok) throw new Error(response.result.error.message);
			return response.result.value;
		}
		function responseMessage(error) {
			return error instanceof Error ? error.message : String(error);
		}
		function deriveKeyRef(provider) {
			return `${provider.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_API_KEY`;
		}
		//#endregion
		//#region src/client/controls/inputs.ts
		const e$15 = react.createElement;
		function option(value, labelKey, labelVars) {
			return e$15("option", {
				key: String(value),
				value
			}, tr(labelKey ?? "", labelVars));
		}
		function TextInput(props) {
			const type = props.type || "text";
			return e$15("input", {
				className: "dsh-ma-input" + (props.className ? " " + props.className : ""),
				type,
				value: props.value === void 0 || props.value === null ? "" : String(props.value),
				disabled: props.disabled === true,
				placeholder: props.placeholderKey ? tr(props.placeholderKey, props.placeholderVars) : props.placeholder,
				"aria-label": props.ariaLabelKey ? tr(props.ariaLabelKey, props.ariaLabelVars) : void 0,
				min: props.min,
				max: props.max,
				step: props.step,
				autoComplete: props.autoComplete,
				onChange: (event) => {
					const raw = event.target.value;
					props.onChange?.(type === "number" ? raw === "" ? void 0 : Number(raw) : raw === "" && props.emptyAsUndefined !== false ? void 0 : raw);
				}
			});
		}
		function CapacityInput(props) {
			const [buffer, setBuffer] = react.useState(void 0);
			react.useEffect(() => {
				setBuffer((current) => {
					if (current === void 0) return current;
					if (props.allowLow && current.trim().toLowerCase() === "low") return props.value === "low" ? current : void 0;
					const parsed = parseCapacity(current);
					return (parsed === void 0 ? props.value === void 0 : parsed === props.value) ? current : void 0;
				});
			}, [props.value, props.allowLow]);
			const display = buffer ?? (props.value === void 0 ? "" : props.value === "low" ? "low" : formatCapacity(props.value));
			return e$15("input", {
				className: "dsh-ma-input",
				type: "text",
				inputMode: props.allowLow ? void 0 : "numeric",
				value: display,
				disabled: props.disabled === true,
				placeholder: props.placeholderKey ? tr(props.placeholderKey, props.placeholderVars) : props.placeholder,
				"aria-label": props.ariaLabelKey ? tr(props.ariaLabelKey, props.ariaLabelVars) : void 0,
				onBlur: () => setBuffer(void 0),
				onChange: (event) => {
					const raw = event.target.value;
					setBuffer(raw);
					if (props.allowLow && raw.trim().toLowerCase() === "low") {
						props.onChange?.("low");
						return;
					}
					const parsed = parseCapacity(raw);
					if (parsed === void 0) props.onChange?.(void 0);
					else if (!Number.isNaN(parsed)) props.onChange?.(parsed);
				}
			});
		}
		function Select(props) {
			const choices = Array.isArray(props.choices) ? props.choices : [];
			return e$15("select", {
				className: "dsh-ma-select" + (props.className ? " " + props.className : ""),
				value: props.value === void 0 || props.value === null ? "" : String(props.value),
				disabled: props.disabled === true,
				"aria-label": props.ariaLabelKey ? tr(props.ariaLabelKey, props.ariaLabelVars) : void 0,
				onChange: (event) => props.onChange?.(event.target.value === "" ? void 0 : event.target.value)
			}, props.allowUnset === false ? null : option("", props.unsetKey || "controls.select.unset"), choices.map((choice) => {
				return option(typeof choice === "string" ? choice : choice.value, typeof choice === "string" ? props.choiceKeyPrefix ? props.choiceKeyPrefix + "." + choice : choice : choice.labelKey, typeof choice === "string" ? void 0 : choice.labelVars);
			}));
		}
		function ProtocolSelect(props) {
			return e$15(Select, {
				value: props.value || "openai-completions",
				onChange: props.onChange,
				disabled: props.disabled,
				allowUnset: props.allowUnset ?? false,
				choices: [...protocolChoices()],
				choiceKeyPrefix: "controls.protocol",
				unsetKey: props.unsetKey || "controls.select.unset",
				ariaLabelKey: props.ariaLabelKey || "controls.protocol.label"
			});
		}
		//#endregion
		//#region src/client/controls/modalities.ts
		const e$14 = react.createElement;
		function Modalities(props) {
			const selected = Array.isArray(props.value) ? props.value : [];
			return e$14("div", { className: "dsh-ma-checks" }, MODALITIES.map((item) => e$14("label", {
				key: item,
				className: "dsh-ma-check"
			}, e$14("input", {
				type: "checkbox",
				checked: selected.includes(item),
				disabled: props.disabled === true,
				onChange: (event) => props.onChange?.(event.target.checked ? [...selected, item] : selected.filter((entry) => entry !== item))
			}), tr("controls.modality." + item))));
		}
		//#endregion
		//#region src/client/controls/key-value-list.ts
		const e$13 = react.createElement;
		function KeyValueList(props) {
			const values = isObject(props.value) ? props.value : {};
			const levels = props.kind === "efforts";
			const levelChoices = levels ? reasoningLevelChoices() : [];
			const entries = levels ? Object.entries(values).sort(([a], [b]) => {
				const indexA = levelChoices.indexOf(a);
				const indexB = levelChoices.indexOf(b);
				return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
			}) : Object.entries(values);
			const sortEfforts = (record) => {
				const sorted = {};
				for (const level of levelChoices) if (Object.prototype.hasOwnProperty.call(record, level)) sorted[level] = record[level];
				for (const [k, v] of Object.entries(record)) if (!Object.prototype.hasOwnProperty.call(sorted, k)) sorted[k] = v;
				return sorted;
			};
			const setEntry = (from, to, nextValue) => {
				const next = {};
				for (const [key, value] of entries) next[key === from ? to : key] = key === from ? nextValue : value;
				props.onChange?.(levels ? sortEfforts(next) : next);
			};
			const add = () => {
				if (levels) {
					const available = levelChoices.find((level) => !Object.prototype.hasOwnProperty.call(values, level));
					if (available !== void 0) props.onChange?.(sortEfforts({
						...values,
						[available]: available === "off" ? null : available
					}));
					return;
				}
				let index = 1;
				let name = "X-Custom-" + index;
				while (Object.prototype.hasOwnProperty.call(values, name)) {
					index += 1;
					name = "X-Custom-" + index;
				}
				props.onChange?.({
					...values,
					[name]: ""
				});
			};
			return e$13("div", { className: "dsh-ma-wide" }, entries.map(([key, value], index) => e$13("div", {
				className: "dsh-ma-kv",
				key: key + "-" + index
			}, levels ? e$13(Select, {
				value: key,
				disabled: props.disabled,
				allowUnset: false,
				choices: [...levelChoices],
				choiceKeyPrefix: "controls.reasoningLevel",
				onChange: (nextKey) => setEntry(key, nextKey, value)
			}) : e$13(TextInput, {
				value: key,
				disabled: props.disabled,
				emptyAsUndefined: false,
				placeholderKey: "controls.keyValue.headers.keyPlaceholder",
				onChange: (nextKey) => setEntry(key, nextKey, value)
			}), e$13(TextInput, {
				value: value === null ? "" : value,
				disabled: props.disabled,
				emptyAsUndefined: false,
				placeholderKey: levels && key === "off" ? "controls.keyValue.efforts.offValuePlaceholder" : levels ? "controls.keyValue.efforts.valuePlaceholder" : "controls.keyValue.headers.valuePlaceholder",
				onChange: (nextValue) => setEntry(key, key, levels && key === "off" && nextValue === "" ? null : nextValue)
			}), e$13("button", {
				type: "button",
				className: "dsh-ma-button dsh-ma-icon",
				disabled: props.disabled === true,
				title: tr("controls.keyValue.remove"),
				"aria-label": tr("controls.keyValue.remove"),
				onClick: () => {
					const next = { ...values };
					delete next[key];
					props.onChange?.(next);
				}
			}, e$13(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 16 })))), e$13("button", {
				type: "button",
				className: "dsh-ma-button",
				disabled: props.disabled === true || levels && entries.length === levelChoices.length,
				style: { marginTop: "8px" },
				onClick: add
			}, e$13(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutlineRegular, { size: 14 }), tr(levels ? "controls.keyValue.efforts.add" : "controls.keyValue.headers.add")));
		}
		//#endregion
		//#region src/client/compat.ts
		/**
		* Every compat field the pi-ai adapter offers, in the schema's declaration
		* order. `COMPAT_PROTOCOL_FIELDS` below names which protocol offers which.
		*/
		const COMPAT_FIELDS = [
			{
				key: "supportsStore",
				kind: "boolean"
			},
			{
				key: "supportsDeveloperRole",
				kind: "boolean"
			},
			{
				key: "supportsReasoningEffort",
				kind: "boolean"
			},
			{
				key: "supportsUsageInStreaming",
				kind: "boolean"
			},
			{
				key: "supportsFinishReason",
				kind: "boolean"
			},
			{
				key: "maxTokensField",
				kind: "enum",
				choices: MAX_TOKENS_FIELDS
			},
			{
				key: "requiresToolResultName",
				kind: "boolean"
			},
			{
				key: "requiresAssistantAfterToolResult",
				kind: "boolean"
			},
			{
				key: "requiresThinkingAsText",
				kind: "boolean"
			},
			{
				key: "requiresReasoningContentOnAssistantMessages",
				kind: "boolean"
			},
			{
				key: "thinkingFormat",
				kind: "enum",
				choices: THINKING_FORMATS
			},
			{
				key: "chatTemplateKwargs",
				kind: "json",
				wide: true
			},
			{
				key: "chatTemplateArgs",
				kind: "json",
				wide: true
			},
			{
				key: "supportsThinkingTokenBudget",
				kind: "boolean"
			},
			{
				key: "thinkingTokenBudgetField",
				kind: "enum",
				choices: THINKING_TOKEN_BUDGET_FIELDS
			},
			{
				key: "vllmPriority",
				kind: "integer"
			},
			{
				key: "supportsMaxOutputTokens",
				kind: "boolean"
			},
			{
				key: "supportsStrictMode",
				kind: "boolean"
			},
			{
				key: "cacheControlFormat",
				kind: "enum",
				choices: CACHE_CONTROL_FORMATS
			},
			{
				key: "supportsLongCacheRetention",
				kind: "boolean"
			},
			{
				key: "supportsEagerToolInputStreaming",
				kind: "boolean"
			},
			{
				key: "supportsCacheControlOnTools",
				kind: "boolean"
			},
			{
				key: "supportsTemperature",
				kind: "boolean"
			},
			{
				key: "forceAdaptiveThinking",
				kind: "boolean"
			},
			{
				key: "allowEmptySignature",
				kind: "boolean"
			},
			{
				key: "supportsStrictTools",
				kind: "boolean"
			}
		];
		/** Compat keys each wire protocol accepts, in declaration order. */
		const COMPAT_PROTOCOL_FIELDS = {
			"openai-completions": [
				"thinkingFormat",
				"supportsReasoningEffort",
				"supportsDeveloperRole",
				"supportsStore",
				"supportsUsageInStreaming",
				"supportsFinishReason",
				"maxTokensField",
				"requiresToolResultName",
				"requiresAssistantAfterToolResult",
				"requiresThinkingAsText",
				"requiresReasoningContentOnAssistantMessages",
				"chatTemplateKwargs",
				"chatTemplateArgs",
				"supportsThinkingTokenBudget",
				"thinkingTokenBudgetField",
				"vllmPriority",
				"supportsStrictMode",
				"cacheControlFormat",
				"supportsLongCacheRetention"
			],
			"openai-responses": [
				"supportsDeveloperRole",
				"supportsMaxOutputTokens",
				"supportsStrictMode",
				"supportsLongCacheRetention"
			],
			"anthropic-messages": [
				"supportsTemperature",
				"forceAdaptiveThinking",
				"supportsEagerToolInputStreaming",
				"supportsCacheControlOnTools",
				"allowEmptySignature",
				"supportsStrictTools",
				"supportsLongCacheRetention"
			]
		};
		/**
		* The compat fields one route's protocol offers, in table order.
		* @param api - the route's wire protocol; an unset or unknown protocol takes
		*   the same set the editor and the adapter default to.
		* @returns the offered fields; empty when the protocol declares no compat type.
		*/
		function compatFields(api) {
			const allowed = COMPAT_PROTOCOL_FIELDS[api ?? "openai-completions"] ?? COMPAT_PROTOCOL_FIELDS["openai-completions"];
			return COMPAT_FIELDS.filter((field) => allowed.includes(field.key));
		}
		/**
		* Report whether a compat entry carries a value at all. An absent key, an empty
		* string, and an empty object all mean "not configured": schemastery materializes
		* an absent dict as `{}`, so an empty one states nothing.
		* @param value - one compat entry's value.
		* @returns whether the entry should be treated as configured.
		*/
		function compatValueConfigured(value) {
			if (value === void 0 || value === null || value === "") return false;
			if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) return false;
			return true;
		}
		/**
		* Reduce one compat dict to the keys the route's protocol accepts, dropping
		* entries that state nothing. The editor, the page and the save path all use
		* this so a protocol switch cannot leave a key behind that will be rejected.
		* @param compat - the drafted compat dict.
		* @param api - the route's wire protocol as currently drafted.
		* @returns the accepted entries, or undefined when none survive.
		*/
		function filterCompatForProtocol(compat, api) {
			if (compat === void 0) return void 0;
			const allowed = new Set(compatFields(api).map((field) => field.key));
			const filtered = {};
			for (const [key, value] of Object.entries(compat)) if (allowed.has(key) && compatValueConfigured(value)) filtered[key] = value;
			return Object.keys(filtered).length === 0 ? void 0 : filtered;
		}
		//#endregion
		//#region src/client/controls/compat-editor.ts
		const e$12 = react.createElement;
		/**
		* Read one JSON-object control's text.
		* @param text - the control's current text.
		* @returns the parsed value, or a failure the control reports.
		*/
		function parseJsonObject(text) {
			if (text.trim().length === 0) return { ok: false };
			try {
				return {
					ok: true,
					value: JSON.parse(text)
				};
			} catch {
				return { ok: false };
			}
		}
		/**
		* Free-form JSON object control for `chatTemplateKwargs` / `chatTemplateArgs`.
		*
		* These two keys carry a dict whose shape the adapter's own schema owns, so the
		* control keeps the text and reports whether it parses instead of duplicating
		* that shape here. It is a module of its own because it is the only control that
		* holds text that may be invalid mid-typing.
		*/
		function JsonObjectField({ field, value, disabled, onChange }) {
			const label = tr(`controls.compat.${field.key}`);
			const [text, setText] = react.useState(() => value === void 0 ? "" : JSON.stringify(value, null, 2));
			const parsed = parseJsonObject(text);
			const blank = text.trim().length === 0;
			return e$12("div", { className: "dsh-ma-field dsh-ma-wide" }, e$12("span", { className: "dsh-ma-field-label" }, label), e$12("textarea", {
				className: "dsh-ma-input",
				rows: 4,
				spellCheck: false,
				value: text,
				disabled,
				placeholder: tr(`controls.compat.${field.key}Placeholder`),
				"aria-label": label,
				onChange: (event) => {
					const next = event.target.value;
					setText(next);
					if (next.trim().length === 0) {
						onChange(void 0);
						return;
					}
					const result = parseJsonObject(next);
					if (result.ok) onChange(result.value);
				}
			}), blank || parsed.ok ? null : e$12("span", {
				className: "dsh-ma-route",
				role: "alert"
			}, tr("validation.json")));
		}
		/**
		* The compatibility card for one route.
		*
		* The field set, the control kind per field and the protocol filter all come
		* from `../compat.ts`: this module renders the table rather than restating it,
		* so a field the adapter offers can no longer be allow-listed, validated and
		* yet missing a control.
		*/
		function CompatEditor(props) {
			const [open, setOpen] = react.useState(props.defaultOpen ?? false);
			const compat = isObject(props.value) ? props.value : {};
			const read = (key) => compat[key];
			const fields = compatFields(props.api);
			const set = (field, value) => {
				const next = { ...compat };
				if (value === void 0 || value === "") delete next[field];
				else next[field] = value;
				props.onChange?.(filterCompatForProtocol(next, props.api));
			};
			const configuredCount = Object.entries(compat).filter(([key, value]) => fields.some((field) => field.key === key) && compatValueConfigured(value)).length;
			const control = (field) => {
				const labelKey = `controls.compat.${field.key}`;
				if (field.kind === "boolean") return e$12(Field, {
					labelKey,
					key: field.key
				}, e$12(Select, {
					value: typeof read(field.key) === "boolean" ? String(read(field.key)) : void 0,
					choices: [{
						value: "true",
						labelKey: "controls.boolean.supported"
					}, {
						value: "false",
						labelKey: "controls.boolean.unsupported"
					}],
					disabled: props.disabled,
					unsetKey: "controls.select.auto",
					onChange: (value) => set(field.key, value === void 0 ? void 0 : value === "true")
				}));
				if (field.kind === "enum") return e$12(Field, {
					labelKey,
					key: field.key
				}, e$12(Select, {
					value: typeof read(field.key) === "string" ? read(field.key) : void 0,
					choices: [...field.choices ?? []],
					disabled: props.disabled,
					unsetKey: "controls.select.auto",
					onChange: (value) => set(field.key, value)
				}));
				if (field.kind === "integer") return e$12(Field, {
					labelKey,
					key: field.key
				}, e$12(TextInput, {
					type: "number",
					step: 1,
					value: read(field.key),
					placeholderKey: `${labelKey}Placeholder`,
					disabled: props.disabled,
					onChange: (value) => set(field.key, typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : void 0)
				}));
				return e$12(JsonObjectField, {
					key: field.key,
					field,
					value: read(field.key),
					disabled: props.disabled,
					onChange: (value) => set(field.key, value)
				});
			};
			return e$12("div", { className: "dsh-ma-card" }, e$12("div", {
				className: "dsh-ma-card-head",
				role: "button",
				tabIndex: 0,
				"aria-expanded": open,
				onClick: () => setOpen((prev) => !prev),
				onKeyDown: (event) => {
					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						setOpen((prev) => !prev);
					}
				}
			}, e$12("div", { className: "dsh-ma-card-title" }, e$12("span", null, tr(props.titleKey || "controls.compat.title")), configuredCount > 0 ? e$12("span", { className: "dsh-ma-tag" }, tr("controls.compat.configuredCount", { count: configuredCount })) : null), e$12("button", {
				type: "button",
				className: "dsh-ma-button",
				style: {
					height: "26px",
					minHeight: "26px",
					fontSize: "12px",
					padding: "0 8px"
				},
				disabled: props.disabled,
				"aria-expanded": open,
				onClick: (event) => {
					event.stopPropagation();
					setOpen((prev) => !prev);
				}
			}, tr(open ? "action.collapse" : "action.expand"))), open ? e$12("div", { className: "dsh-ma-card-body" }, e$12("div", { className: "dsh-ma-grid" }, fields.map((field) => control(field)))) : null);
		}
		//#endregion
		//#region src/client/controls/reasoning-efforts-editor.ts
		const e$11 = react.createElement;
		function ReasoningEffortsEditor(props) {
			const [open, setOpen] = react.useState(props.defaultOpen ?? false);
			const isCustom = isObject(props.value);
			const mode = props.value === false ? "disabled" : isCustom ? "custom" : "inherit";
			const configuredCount = isObject(props.value) ? Object.keys(props.value).length : 0;
			let badgeText = tr("models.reasoning.inherit");
			if (mode === "disabled") badgeText = tr("models.reasoning.disabled");
			else if (mode === "custom") badgeText = tr("models.reasoning.customCount", { count: configuredCount });
			const handleModeChange = (nextMode) => {
				if (nextMode === "inherit") props.onChange(void 0);
				else if (nextMode === "disabled") props.onChange(false);
				else if (nextMode === "custom") props.onChange(createDefaultReasoningEfforts());
			};
			return e$11("div", { className: "dsh-ma-card" }, e$11("div", {
				className: "dsh-ma-card-head",
				role: "button",
				tabIndex: 0,
				"aria-expanded": open,
				onClick: () => setOpen((prev) => !prev),
				onKeyDown: (event) => {
					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						setOpen((prev) => !prev);
					}
				}
			}, e$11("div", { className: "dsh-ma-card-title" }, e$11("span", null, tr(props.titleKey || "models.field.reasoningEfforts")), e$11("span", { className: "dsh-ma-tag" }, badgeText)), e$11("button", {
				type: "button",
				className: "dsh-ma-button",
				style: {
					height: "26px",
					minHeight: "26px",
					fontSize: "12px",
					padding: "0 8px"
				},
				disabled: props.disabled,
				"aria-expanded": open,
				onClick: (event) => {
					event.stopPropagation();
					setOpen((prev) => !prev);
				}
			}, tr(open ? "action.collapse" : "action.expand"))), open ? e$11("div", {
				className: "dsh-ma-card-body",
				style: {
					display: "flex",
					flexDirection: "column",
					gap: "10px"
				}
			}, e$11(Select, {
				value: mode,
				disabled: props.disabled,
				allowUnset: false,
				choices: [
					{
						value: "inherit",
						labelKey: "models.reasoning.inherit"
					},
					{
						value: "disabled",
						labelKey: "models.reasoning.disabled"
					},
					{
						value: "custom",
						labelKey: "models.reasoning.custom"
					}
				],
				onChange: handleModeChange
			}), isCustom ? e$11(KeyValueList, {
				kind: "efforts",
				value: props.value,
				disabled: props.disabled,
				onChange: (nextValue) => props.onChange(nextValue)
			}) : null) : null);
		}
		//#endregion
		//#region src/client/controls/retry-policy.ts
		const e$10 = react.createElement;
		function RetryPolicy(props) {
			const stored = isObject(props.value) ? props.value : {};
			const mode = stored.mode === "always" ? "always" : "normal";
			const maxRetries = typeof stored.maxRetries === "number" ? stored.maxRetries : void 0;
			const retryableCodes = Array.isArray(stored.retryableCodes) ? stored.retryableCodes : void 0;
			const backoff = isObject(stored.backoff) ? stored.backoff : {};
			/** Emit one well-formed policy, defaulting the bounded-only fields. */
			const emit = (next) => props.onChange?.(next.mode === "always" ? {
				mode: "always",
				backoff: next.backoff ?? backoff
			} : {
				mode: "normal",
				maxRetries: next.maxRetries ?? 2,
				retryableCodes: next.retryableCodes ?? [...DEFAULT_RETRYABLE_CODES],
				backoff: next.backoff ?? backoff
			});
			const setBackoff = (field, value) => emit({
				mode,
				backoff: {
					...backoff,
					[field]: value
				}
			});
			return e$10("div", { className: "dsh-ma-grid dsh-ma-wide" }, e$10(Field, { labelKey: "controls.retry.modeLabel" }, e$10(Select, {
				value: mode,
				allowUnset: false,
				disabled: props.disabled,
				choices: [{
					value: "normal",
					labelKey: "controls.retry.mode.normal"
				}, {
					value: "always",
					labelKey: "controls.retry.mode.always"
				}],
				onChange: (next) => emit({ mode: next === "always" ? "always" : "normal" })
			})), mode === "normal" ? e$10(Field, { labelKey: "controls.retry.maxRetries" }, e$10(TextInput, {
				type: "number",
				min: 0,
				step: 1,
				value: maxRetries,
				disabled: props.disabled,
				onChange: (value) => emit({
					mode: "normal",
					maxRetries: typeof value === "number" ? value : void 0
				})
			})) : null, mode === "normal" ? e$10(Field, {
				labelKey: "controls.retry.retryableCodes",
				wide: true
			}, e$10(TextInput, {
				value: Array.isArray(retryableCodes) ? retryableCodes.join(", ") : "",
				disabled: props.disabled,
				emptyAsUndefined: false,
				onChange: (value) => emit({
					mode: "normal",
					retryableCodes: String(value).split(/[,\s]+/).map((item) => item.trim()).filter(Boolean)
				})
			})) : null, e$10(Field, { labelKey: "controls.retry.initialDelayMs" }, e$10(TextInput, {
				type: "number",
				min: 1,
				max: MAX_TIMER_DELAY_MS,
				value: backoff.initialDelayMs,
				disabled: props.disabled,
				onChange: (value) => setBackoff("initialDelayMs", value)
			})), e$10(Field, { labelKey: "controls.retry.maxDelayMs" }, e$10(TextInput, {
				type: "number",
				min: 1,
				max: MAX_TIMER_DELAY_MS,
				value: backoff.maxDelayMs,
				disabled: props.disabled,
				onChange: (value) => setBackoff("maxDelayMs", value)
			})), e$10(Field, { labelKey: "controls.retry.jitterRatio" }, e$10(TextInput, {
				type: "number",
				min: 0,
				max: 1,
				step: .01,
				value: backoff.jitterRatio,
				disabled: props.disabled,
				onChange: (value) => setBackoff("jitterRatio", value)
			})));
		}
		//#endregion
		//#region src/client/styles.ts
		const CSS = `
      .dsh-ma-page{box-sizing:border-box;color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;gap:12px;max-width:880px;padding-bottom:24px;width:100%}
      .dsh-ma-page *{box-sizing:border-box;letter-spacing:0}
      .dsh-ma-header{align-items:center;display:flex;gap:12px;justify-content:space-between}
      .dsh-ma-title{color:var(--dsw-alias-label-primary);font-size:16px;font-weight:600;line-height:24px;margin:0}
      .dsh-ma-toolbar,.dsh-ma-actions{align-items:center;display:flex;gap:8px}
      .dsh-ma-button{align-items:center;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;color:var(--dsw-alias-label-primary);cursor:pointer;display:inline-flex;font:inherit;font-size:13px;gap:5px;height:32px;justify-content:center;line-height:20px;min-width:32px;padding:0 10px}
      .dsh-ma-button:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-brand-primary)}
      .dsh-ma-button:focus-visible,.dsh-ma-input:focus-visible,.dsh-ma-select:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
      .dsh-ma-button:disabled,.dsh-ma-input:disabled,.dsh-ma-select:disabled{cursor:not-allowed;opacity:.55}
      .dsh-ma-primary{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary-foreground)}
      .dsh-ma-primary:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover,var(--dsw-alias-brand-primary));border-color:var(--dsw-alias-button-primary-hover,var(--dsw-alias-brand-primary))}
      .dsh-ma-icon{padding:0;width:32px}
      .dsh-ma-status{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;margin:0}
      .dsh-ma-error{color:var(--dsw-alias-state-error-primary)}
      .dsh-ma-success{color:var(--dsw-alias-state-success-primary)}
      .dsh-ma-notice{background:var(--dsw-alias-bg-layer-2);border-left:3px solid var(--dsw-alias-state-warn-primary);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;padding:8px 10px}
      .dsh-ma-list,.dsh-ma-form{display:flex;flex-direction:column}
      .dsh-ma-section-title{color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:600;line-height:18px;margin:18px 0 4px}
      .dsh-ma-section-title:first-child{margin-top:0}
      .dsh-ma-provider{border-bottom:1px solid var(--dsw-alias-border-l1)}
      .dsh-ma-provider-head{align-items:center;display:flex;gap:10px;min-height:54px;padding:10px 2px}
      .dsh-ma-identity{align-items:center;display:flex;flex:1;gap:8px;min-width:0}
      .dsh-ma-name{font-size:14px;font-weight:600;line-height:20px;overflow-wrap:anywhere}
      .dsh-ma-route{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;overflow-wrap:anywhere}
      .dsh-ma-tag{border:1px solid var(--dsw-alias-border-l2);border-radius:4px;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:16px;padding:1px 6px}
      .dsh-ma-form{padding:4px 0 18px}
      .dsh-ma-group{border-top:1px solid var(--dsw-alias-border-l1);display:flex;flex-direction:column;gap:10px;padding:14px 2px}
      .dsh-ma-group:first-child{border-top:0}
      .dsh-ma-group-title{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:600;line-height:20px;margin:0}
      .dsh-ma-grid{display:grid;gap:10px 12px;grid-template-columns:repeat(2,minmax(0,1fr))}
      .dsh-ma-grid-3{grid-template-columns:repeat(3,minmax(0,1fr))}
      .dsh-ma-wide{grid-column:1/-1}
      .dsh-ma-field{display:flex;flex-direction:column;gap:5px;min-width:0}
      .dsh-ma-field-label{align-items:center;color:var(--dsw-alias-label-secondary);display:flex;font-size:12px;gap:6px;line-height:18px;min-height:20px}
      .dsh-ma-override,.dsh-ma-check input{accent-color:var(--dsw-alias-brand-primary);margin:0}
      .dsh-ma-input,.dsh-ma-select{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;height:34px;line-height:20px;padding:0 9px;width:100%}
      .dsh-ma-input::placeholder{color:var(--dsw-alias-label-secondary)}
      .dsh-ma-input:disabled,.dsh-ma-select:disabled{background:var(--dsw-alias-bg-layer-2)}
      .dsh-ma-checks{align-items:center;display:flex;flex-wrap:wrap;gap:8px 16px;min-height:34px}
      .dsh-ma-check{align-items:center;color:var(--dsw-alias-label-secondary);display:inline-flex;font-size:12px;gap:6px}
      .dsh-ma-kv{display:grid;gap:8px;grid-template-columns:minmax(120px,.8fr) minmax(180px,1.2fr) 32px;margin-top:6px}
      .dsh-ma-actions{border-top:1px solid var(--dsw-alias-border-l1);justify-content:flex-end;padding:14px 2px 0}
      .dsh-ma-create{border-bottom:1px solid var(--dsw-alias-border-l1);display:flex;flex-direction:column;gap:12px;padding:0 2px 16px}
      .dsh-ma-delete-confirm{background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-state-warn-primary);border-radius:6px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;margin:0 2px 12px;padding:10px}
      .dsh-ma-delete-confirm p{margin:0}
      .dsh-ma-delete-confirm .dsh-ma-actions{border-top:0;padding-top:8px}
      .dsh-ma-models{display:flex;flex-direction:column;gap:6px;max-height:360px;overflow:auto}
      .dsh-ma-model{border-top:1px solid var(--dsw-alias-border-l1);display:flex;flex-direction:column;gap:10px;padding:12px 0}
      .dsh-ma-model:first-child{border-top:0}
      .dsh-ma-model-head{align-items:center;display:flex;gap:10px;justify-content:space-between}
      .dsh-ma-model-title{color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:600;line-height:18px;overflow-wrap:anywhere}
      .dsh-ma-subgrid{display:grid;gap:8px;grid-template-columns:repeat(4,minmax(0,1fr))}
      .dsh-ma-modal-body{display:flex;flex-direction:column;gap:12px;min-width:min(520px,calc(100vw - 48px))}
      .dsh-ma-card{background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:6px;display:flex;flex-direction:column;margin-top:2px;overflow:hidden;width:100%}
      .dsh-ma-card-head{align-items:center;background:transparent;border:0;color:var(--dsw-alias-label-primary);cursor:pointer;display:flex;font:inherit;gap:8px;justify-content:space-between;min-height:36px;padding:6px 10px;text-align:left;user-select:none;width:100%}
      .dsh-ma-card-head:hover{background:var(--dsw-alias-bg-layer-1)}
      .dsh-ma-card-title{align-items:center;display:inline-flex;font-size:12px;font-weight:600;gap:8px;line-height:18px}
      .dsh-ma-card-body{border-top:1px solid var(--dsw-alias-border-l1);padding:10px}
      @media(max-width:720px){.dsh-ma-grid,.dsh-ma-grid-3,.dsh-ma-subgrid{grid-template-columns:1fr}.dsh-ma-wide{grid-column:auto}.dsh-ma-kv{grid-template-columns:minmax(0,1fr) minmax(0,1fr) 32px}.dsh-ma-provider-head{align-items:flex-start;flex-wrap:wrap}}
`;
		//#endregion
		//#region src/client/providers/credential-field.ts
		const e$9 = react.createElement;
		/**
		* The write-only key input, with the route's credential posture beside it.
		*
		* The posture itself is `../credential-status.ts`: a policy with branches that
		* are worth testing and that a test can reach only from a module without a
		* React runtime.
		*/
		function CredentialField({ api, keyRef, revision, value, onChange, disabled, nativeAuth, credentialChecks, hasNamedRef }) {
			const [state, setState] = react.useState();
			react.useEffect(() => {
				let active = true;
				api.credentials.describe([keyRef]).then((response) => {
					if (active && response.result.ok) setState(response.result.value?.[keyRef]);
				}, () => void 0);
				return () => {
					active = false;
				};
			}, [
				api,
				keyRef,
				revision
			]);
			const status = credentialStatus(nativeAuth, react.useMemo(() => mergeCredentialChecks(credentialChecks, keyRef, state), [
				credentialChecks,
				keyRef,
				state
			]), hasNamedRef === true, keyRef);
			return e$9("label", { className: "dsh-ma-field" }, e$9("span", { className: "dsh-ma-field-label" }, tr("credential.label", { status })), e$9(TextInput, {
				type: "password",
				value,
				disabled,
				placeholderKey: "placeholder.keepKey",
				onChange
			}));
		}
		//#endregion
		//#region src/client/commit.ts
		/**
		* Apply one draft: write the profile, then the credential, then reload.
		*
		* The order is the point. The profile write is the one the Host fences with a
		* revision and validates against the namespace schema, so a refusal there means
		* nothing else should happen; the credential write is a separate store that is
		* idempotent, so it goes second and its failure leaves a provider whose model
		* list is already saved and only the key outstanding. Doing it the other way
		* round used to leave a stored key on a profile the Host had refused.
		* @param request - the batch, its credential follow-up, and the reload.
		* @returns the outcome the caller renders.
		*/
		async function commit(request) {
			if (!await writeOps(request.form, request.ops)) return { kind: "conflict" };
			if (request.credential !== void 0) try {
				const response = await request.api.credentials.set({
					ref: request.credential.ref,
					value: request.credential.value
				});
				if (!response.result.ok) return {
					kind: "credential-failed",
					message: response.result.error.message
				};
			} catch (error) {
				return {
					kind: "credential-failed",
					message: responseMessage(error)
				};
			}
			try {
				await request.reload();
			} catch (error) {
				return {
					kind: "failed",
					message: responseMessage(error)
				};
			}
			return { kind: "written" };
		}
		/**
		* Remove one provider profile and the credential it owns.
		*
		* The credential goes first, matching the Host's own page: both unsets are
		* idempotent, so a second-step failure leaves the row visible and the whole
		* delete safely retryable.
		* @param request - the path to clear, its credential, and the reload.
		* @returns the outcome the caller renders.
		*/
		async function removeProfile(request) {
			if (request.credentialRef !== void 0) try {
				const response = await request.api.credentials.unset({ ref: request.credentialRef });
				if (!response.result.ok) return {
					kind: "failed",
					message: response.result.error.message
				};
			} catch (error) {
				return {
					kind: "failed",
					message: responseMessage(error)
				};
			}
			if (!await writeOps(request.form, [{
				op: "unset",
				path: [...request.path]
			}])) return { kind: "conflict" };
			try {
				await request.reload();
			} catch (error) {
				return {
					kind: "failed",
					message: responseMessage(error)
				};
			}
			return { kind: "written" };
		}
		/**
		* The message a caller shows for one outcome, or undefined when it succeeded.
		* @param outcome - what {@link commit} or {@link removeProfile} returned.
		* @returns the localized failure text.
		*/
		function outcomeMessage(outcome) {
			if (outcome.kind === "written") return void 0;
			if (outcome.kind === "conflict") return tr("validation.writeConflict");
			return outcome.message;
		}
		/**
		* Diff one drafted subtree against the user layer it came from, naming only the
		* fields that differ. A field present in the draft but absent from the baseline
		* becomes a set; a field the baseline had and the draft dropped becomes an
		* unset. Fields absent from both produce no op.
		* @param path - path of the subtree inside the namespace's user layer.
		* @param baseline - the user layer as loaded.
		* @param draft - the subtree as edited.
		* @returns ordered path operations; empty when nothing changed.
		*/
		function diffProfile(path, baseline, draft) {
			const previous = isRecord(baseline) ? baseline : {};
			const ops = [];
			for (const [field, value] of Object.entries(draft)) {
				if (value === void 0) continue;
				if (!owns(previous, field) || !equal(previous[field], value)) ops.push({
					op: "set",
					path: [...path, field],
					value: clone(value)
				});
			}
			for (const field of Object.keys(previous)) if (!owns(draft, field) || draft[field] === void 0) ops.push({
				op: "unset",
				path: [...path, field]
			});
			return ops;
		}
		/**
		* Narrow untrusted wire data to a plain object.
		* @param value - candidate value.
		* @returns whether it is a non-array object.
		*/
		function isRecord(value) {
			return value !== null && typeof value === "object" && !Array.isArray(value);
		}
		//#endregion
		//#region src/client/state.ts
		/**
		* The disclosed input types we can actually store, in wire order. An endpoint
		* may echo anything; narrowing here keeps a malformed value out of the draft.
		* @param candidate - one discovered model.
		* @returns the recognized modalities, empty when none were disclosed.
		*/
		function disclosedModalities(candidate) {
			return Array.isArray(candidate.inputModalities) ? candidate.inputModalities.filter((item) => MODALITIES.includes(item)) : [];
		}
		/**
		* Project one discovered candidate onto the model shape a pi-ai route stores.
		* `description` is deliberately dropped: it exists only in the official
		* catalog's model entry, not in `PiAiModelProfile`.
		* @param candidate - one discovered model.
		* @returns the profile fields the discovered facts can fill.
		*/
		function discoveredModelProfile(candidate) {
			const modalities = disclosedModalities(candidate);
			return {
				...candidate.id ? { id: candidate.id } : {},
				...candidate.name ? { name: candidate.name } : {},
				...typeof candidate.contextWindow === "number" ? { contextWindow: candidate.contextWindow } : {},
				...typeof candidate.maxTokens === "number" ? { maxTokens: candidate.maxTokens } : {},
				...modalities.length > 0 ? { input: modalities } : {}
			};
		}
		function initialEditorState(namespace, path) {
			const profile = clone(at(namespace?.value, path) || {});
			const user = at(namespace?.user, path) || {};
			return {
				profile,
				explicit: Object.fromEntries(PROFILE_FIELDS.map((field) => [field, owns(user, field)]))
			};
		}
		function hasUserProfile(namespace, path) {
			return isObject(at(namespace?.user, path));
		}
		function filterCompatByProtocol(compat, api) {
			return filterCompatForProtocol(compat, api);
		}
		/**
		* Filter model-level and route-level `compat` to only retain fields supported
		* by the route's drafted protocol. When `api` is undefined, keep `compat`
		* untouched.
		* @param profile - the profile about to be saved.
		* @param api - the route's protocol as currently drafted.
		* @returns a profile with every `compat` entry filtered to valid fields for `api`.
		*/
		function stripModelCompat(profile, api) {
			if (api === void 0) return profile;
			const next = clone(profile);
			if (owns(next, "compat")) {
				const cleaned = filterCompatByProtocol(next.compat, api);
				if (cleaned === void 0) delete next.compat;
				else next.compat = cleaned;
			}
			if (Array.isArray(next.models)) next.models = next.models.map((model) => {
				const entry = { ...model };
				const cleaned = filterCompatByProtocol(entry.compat, api);
				if (cleaned === void 0) delete entry.compat;
				else entry.compat = cleaned;
				return entry;
			});
			if (isObject(next.modelOverrides)) {
				const overrides = {};
				for (const [id, model] of Object.entries(next.modelOverrides)) {
					const entry = { ...model };
					const cleaned = filterCompatByProtocol(entry.compat, api);
					if (cleaned === void 0) delete entry.compat;
					else entry.compat = cleaned;
					overrides[id] = entry;
				}
				next.modelOverrides = overrides;
			}
			return next;
		}
		//#endregion
		//#region src/client/plan.ts
		/**
		* Turn one drafted profile into the batch a commit writes, the profile a
		* validator judges, and the credential step that follows.
		*
		* This is the module the old save path was missing: it built `ops` from one
		* projection and handed a second projection to the validator, so a field could
		* pass validation and never be written (or the reverse). Both now come from the
		* same cleaned draft, and the two tests below assert they agree.
		* @param input - the draft, its baseline, and the credential the user typed.
		* @returns the ops, the profile they describe, and the optional credential.
		*/
		function planSave(input) {
			const cleaned = stripModelCompat(input.draft, input.draft.api);
			const ofRoute = new Set(input.chosen);
			const since = input.baseline.profile;
			const wasExplicit = input.baseline.explicit;
			const ops = [];
			for (const field of PROFILE_FIELDS) {
				if (!ofRoute.has(field) && field !== "apiKeyEnv") continue;
				const value = cleaned[field];
				const present = input.explicit[field] === true;
				if (wasExplicit[field] === true && !present) {
					ops.push({
						op: "unset",
						path: [...input.row.settingsPath, field]
					});
					continue;
				}
				if (value === void 0) continue;
				if (!present) continue;
				if (wasExplicit[field] === true && equal(since[field], value)) continue;
				ops.push({
					op: "set",
					path: [...input.row.settingsPath, field],
					value
				});
			}
			const namesApiKey = typeof cleaned.apiKeyEnv === "string";
			const credential = input.keyValue ? {
				ref: input.keyRef,
				value: input.keyValue
			} : void 0;
			if (credential !== void 0 && !namesApiKey) ops.push({
				op: "set",
				path: [...input.row.settingsPath, "apiKeyEnv"],
				value: input.keyRef
			});
			return {
				ops,
				profile: Object.fromEntries(input.chosen.filter((name) => name === "api" && (input.row.declared === true || input.explicit.api === true || cleaned.api !== void 0) || (name === "apiKeyEnv" ? namesApiKey || credential !== void 0 : input.explicit[name] === true)).map((name) => [name, name === "apiKeyEnv" && !namesApiKey ? input.keyRef : cleaned[name]])),
				...credential === void 0 ? {} : { credential }
			};
		}
		/**
		* Diff a profile against its baseline without the explicit-tracking layer.
		* The official editor has no override checkboxes: every field is always the
		* user's, so presence alone decides.
		* @param path - path of the profile inside the namespace's user layer.
		* @param baseline - the user layer as loaded.
		* @param draft - the drafted profile.
		* @returns ordered operations; empty when nothing changed.
		*/
		function planReplace(path, baseline, draft) {
			return diffProfile(path, baseline, draft);
		}
		//#endregion
		//#region src/client/models/discovery-dialog.ts
		const e$8 = react.createElement;
		function ModelDiscoveryDialog({ probe, existing, onApply, onClose }) {
			const [status, setStatus] = react.useState("loading");
			const [candidates, setCandidates] = react.useState([]);
			const [picked, setPicked] = react.useState(() => /* @__PURE__ */ new Set());
			const [query, setQuery] = react.useState("");
			const [failure, setFailure] = react.useState("");
			react.useEffect(() => {
				let active = true;
				const load = async () => {
					try {
						const request = { settingsNs: probe.settingsNs || "llm-pi-ai" };
						if (probe.provider) request.provider = probe.provider;
						if (probe.baseURL) request.baseURL = probe.baseURL;
						if (probe.api) request.api = probe.api;
						if (probe.apiKey) request.apiKey = probe.apiKey;
						const response = valueOf(await probe.clientApi.llm.discoverModels(request));
						if (active) {
							setCandidates(Array.isArray(response.models) ? response.models : []);
							setStatus("ready");
						}
					} catch (error) {
						if (active) {
							setFailure(responseMessage(error));
							setStatus("error");
						}
					}
				};
				load();
				return () => {
					active = false;
				};
			}, []);
			const needle = query.trim().toLowerCase();
			const filtered = candidates.filter((candidate) => !needle || String(candidate.id).toLowerCase().includes(needle) || String(candidate.name || "").toLowerCase().includes(needle));
			const selectable = filtered.filter((candidate) => !existing.has(candidate.id ?? ""));
			const allSelected = selectable.length > 0 && selectable.every((candidate) => picked.has(candidate.id ?? ""));
			const toggleAll = () => setPicked((current) => {
				const next = new Set(current);
				if (allSelected) selectable.forEach((candidate) => next.delete(candidate.id ?? ""));
				else selectable.forEach((candidate) => next.add(candidate.id ?? ""));
				return next;
			});
			const selected = selectable.filter((candidate) => picked.has(candidate.id ?? ""));
			const footer = e$8("div", { className: "dsh-ma-actions" }, e$8("button", {
				type: "button",
				className: "dsh-ma-button",
				onClick: onClose
			}, tr("models.discovery.cancel")), e$8("button", {
				type: "button",
				className: "dsh-ma-button dsh-ma-primary",
				disabled: selected.length === 0,
				onClick: () => onApply(selected)
			}, tr(selected.length > 0 ? "models.discovery.confirm" : "models.discovery.pickRequired", { count: selected.length })));
			return e$8(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				onClose,
				title: tr("models.discovery.title"),
				closeLabel: tr("models.discovery.close"),
				description: tr("models.discovery.description"),
				footer
			}, status === "loading" ? e$8("p", { className: "dsh-ma-status" }, tr("models.discovery.loading")) : null, status === "error" ? e$8("p", {
				className: "dsh-ma-status dsh-ma-error",
				role: "alert"
			}, failure) : null, status === "ready" ? e$8("div", { className: "dsh-ma-group" }, e$8("input", {
				className: "dsh-ma-input",
				type: "search",
				value: query,
				placeholder: tr("models.discovery.searchPlaceholder"),
				"aria-label": tr("models.discovery.searchLabel"),
				onChange: (event) => setQuery(event.target.value)
			}), e$8("label", { className: "dsh-ma-check" }, e$8("input", {
				type: "checkbox",
				checked: allSelected,
				disabled: selectable.length === 0,
				onChange: toggleAll
			}), tr("models.discovery.selectFiltered")), e$8("div", { className: "dsh-ma-models" }, filtered.map((candidate) => {
				const exists = existing.has(candidate.id ?? "");
				const modalities = disclosedModalities(candidate);
				const facts = [
					typeof candidate.contextWindow === "number" ? tr("models.discovery.contextWindow", { value: formatCapacity(candidate.contextWindow) }) : null,
					typeof candidate.maxTokens === "number" ? tr("models.discovery.maxTokens", { value: formatCapacity(candidate.maxTokens) }) : null,
					modalities.length > 0 ? tr("models.discovery.inputModalities", { value: modalities.map((item) => tr(`controls.modality.${item}`)).join(", ") }) : null
				].filter(Boolean);
				return e$8("label", {
					key: candidate.id,
					className: "dsh-ma-check",
					style: exists ? { opacity: .45 } : void 0
				}, e$8("input", {
					type: "checkbox",
					checked: picked.has(candidate.id ?? ""),
					disabled: exists,
					onChange: () => setPicked((current) => {
						const next = new Set(current);
						if (!next.delete(candidate.id ?? "")) next.add(candidate.id ?? "");
						return next;
					})
				}), e$8("span", null, candidate.name ? `${candidate.name} (${candidate.id})` : candidate.id), facts.length > 0 ? e$8("span", { className: "dsh-ma-route" }, facts.join(" · ")) : null, exists ? e$8("span", { className: "dsh-ma-route" }, tr("models.discovery.existing")) : null);
			}))) : null);
		}
		//#endregion
		//#region src/client/models/model-fields.ts
		const e$7 = react.createElement;
		/**
		* Read one entry loosely: the key comes from the field table, so the value is
		* only meaningful once a descriptor has named it.
		* @param model - the model entry.
		* @param key - the field key.
		* @returns the stored value, if any.
		*/
		function read(model, key) {
			return model[key];
		}
		const text = (key, labelKey, extra) => ({
			key,
			labelKey,
			...extra ?? {},
			render: (model, set, disabled) => e$7(TextInput, {
				value: read(model, key),
				disabled,
				onChange: (value) => set(key, value)
			})
		});
		const capacity = (key, placeholder) => ({
			key,
			labelKey: `models.field.${key}`,
			render: (model, set, disabled) => e$7(CapacityInput, {
				value: read(model, key),
				disabled,
				placeholderKey: placeholder,
				ariaLabelKey: `models.field.${key}`,
				onChange: (value) => set(key, value)
			})
		});
		const modalities = (key, toStored) => ({
			key,
			labelKey: `models.field.${key}`,
			render: (model, set, disabled) => e$7(Modalities, {
				value: read(model, key) ?? [],
				disabled,
				onChange: (value) => set(key, toStored(value))
			})
		});
		/** Fields a pi-ai route's own model list renders. */
		const PI_AI_MODEL_FIELDS = [
			text("id", "models.field.id"),
			text("name", "models.field.name"),
			capacity("contextWindow", "placeholder.contextWindow"),
			capacity("maxTokens", "placeholder.maxTokens"),
			modalities("input", (selected) => selected.length === 0 ? void 0 : selected),
			{
				key: "reasoningEfforts",
				labelKey: "models.field.reasoningEfforts",
				wide: true,
				render: (model, set, disabled) => e$7(ReasoningEffortsEditor, {
					value: model.reasoningEfforts,
					disabled,
					titleKey: "models.field.reasoningEfforts",
					onChange: (value) => set("reasoningEfforts", value)
				})
			},
			{
				key: "compat",
				labelKey: "models.field.compat",
				wide: true,
				render: (model, set, disabled, api) => e$7(CompatEditor, {
					value: model.compat,
					api,
					disabled,
					titleKey: "models.field.compat",
					onChange: (value) => set("compat", value)
				})
			}
		];
		/**
		* Fields the official route's model entry renders. The official catalog models
		* carry their own prompt/tool update semantics and image limits, and they spell
		* modalities as `inputModalities`.
		*/
		const OFFICIAL_MODEL_FIELDS = [
			text("id", "models.field.id"),
			text("name", "models.field.name"),
			text("description", "models.field.description", { wide: true }),
			capacity("contextWindow", "placeholder.contextWindow"),
			capacity("maxTokens", "placeholder.maxTokens"),
			{
				key: "systemPromptUpdate",
				labelKey: "models.field.systemPromptUpdate",
				wide: true,
				render: (model, set, disabled) => e$7(Select, {
					value: model.systemPromptUpdate,
					choices: [{
						value: "in-history",
						labelKey: "models.systemPromptUpdate.inHistory"
					}],
					disabled,
					unsetKey: "models.systemPromptUpdate.default",
					onChange: (value) => set("systemPromptUpdate", value === "in-history" ? "in-history" : void 0)
				})
			},
			{
				key: "toolUpdate",
				labelKey: "models.field.toolUpdate",
				wide: true,
				render: (model, set, disabled) => e$7(Select, {
					value: model.toolUpdate,
					choices: [{
						value: "in-history",
						labelKey: "models.toolUpdate.inHistory"
					}, {
						value: "addition-only",
						labelKey: "models.toolUpdate.additionOnly"
					}],
					disabled,
					unsetKey: "models.toolUpdate.default",
					onChange: (value) => set("toolUpdate", value)
				})
			},
			modalities("inputModalities", (selected) => selected.length === 0 ? ["text"] : selected),
			capacity("imagePixelBudget", "placeholder.imagePixelBudget"),
			capacity("imageMaxBytes", "placeholder.imageMaxBytes")
		];
		/**
		* Render one model entry's fields.
		* @param props - the model, its field set, and the replace callback.
		* @returns the field grid.
		*/
		function ModelFields({ model, fields, api, disabled, onChange }) {
			const set = (field, value) => {
				const next = clone({ ...model });
				if (value === void 0) delete next[field];
				else next[field] = clone(value);
				if (field === "inputModalities") {
					if (!(Array.isArray(value) ? value : []).includes("image")) {
						delete next.imagePixelBudget;
						delete next.imageMaxBytes;
					}
				}
				onChange(next);
			};
			return e$7("div", { className: "dsh-ma-grid" }, fields.map((field) => field.wide ? e$7("div", {
				className: "dsh-ma-wide",
				key: field.key
			}, labeled(field, model, set, disabled, api)) : e$7("label", {
				className: "dsh-ma-field",
				key: field.key
			}, e$7("span", { className: "dsh-ma-field-label" }, tr(field.labelKey)), field.render(model, set, disabled, api))));
		}
		/**
		* Wrap a wide field in its own label, since a wide field's control can be a
		* composite that cannot sit inside a `label` element.
		* @param field - the field descriptor.
		* @param model - the model being edited.
		* @param set - replace one field.
		* @param disabled - whether the list is read-only.
		* @param api - the owning route's protocol.
		* @returns the labeled control.
		*/
		function labeled(field, model, set, disabled, api) {
			return e$7("div", { className: "dsh-ma-field dsh-ma-wide" }, field.key === "reasoningEfforts" || field.key === "compat" ? field.render(model, set, disabled, api) : e$7(react.Fragment, null, e$7("span", { className: "dsh-ma-field-label" }, tr(field.labelKey)), field.render(model, set, disabled, api)));
		}
		//#endregion
		//#region src/client/models/model-list.ts
		const e$6 = react.createElement;
		/**
		* Allocate an id that no sibling entry already uses.
		* @param base - the id to derive from; an empty base falls back to `model`.
		* @param taken - ids already in use.
		* @returns `<base>-copy`, then `<base>-copy-2`, and so on.
		*/
		function uniqueCopyId(base, taken) {
			const stem = base.length > 0 ? base : "model";
			let candidate = `${stem}-copy`;
			let counter = 2;
			while (taken.has(candidate)) {
				candidate = `${stem}-copy-${counter}`;
				counter += 1;
			}
			return candidate;
		}
		/**
		* One model list, for both storage shapes.
		*
		* Before this module the array list and the record list were separate files
		* with byte-identical clone, remove, add and set-field code. The mechanics are
		* shared here; the per-namespace field sets arrive as {@link ModelField}
		* descriptors, which is where the two genuinely differ.
		*/
		function ModelList({ value, onChange, shape, fields, disabled, api, probe, addKey }) {
			const [discovering, setDiscovering] = react.useState(false);
			const list = Array.isArray(value) ? value : [];
			const record = isObject(value) ? value : {};
			const entries = shape === "record" ? Object.entries(record) : list.map((item, index) => [String(index), item]);
			const taken = new Set(entries.map(([, model]) => model.id).filter((id) => !!id));
			const replaceAt = (key, model) => {
				if (shape === "record") {
					onChange({
						...record,
						[key]: model
					});
					return;
				}
				onChange(list.map((item, index) => String(index) === key ? model : item));
			};
			const insertAfter = (key, model) => {
				if (shape === "record") {
					const next = {};
					for (const [id, entry] of Object.entries(record)) {
						next[id] = entry;
						if (id === key) next[uniqueCopyId(id, taken)] = model;
					}
					onChange(next);
					return;
				}
				const index = Number(key);
				onChange([
					...list.slice(0, index + 1),
					model,
					...list.slice(index + 1)
				]);
			};
			const removeAt = (key) => {
				if (shape === "record") {
					const next = { ...record };
					delete next[key];
					onChange(next);
					return;
				}
				onChange(list.filter((_, index) => String(index) !== key));
			};
			const add = () => {
				if (shape === "record") {
					onChange({
						...record,
						[uniqueCopyId("model", taken)]: {}
					});
					return;
				}
				onChange([...list, { id: "" }]);
			};
			return e$6("div", { className: "dsh-ma-wide" }, entries.map(([key, model], index) => e$6("div", {
				className: "dsh-ma-model",
				key: `${key}-${index}`
			}, e$6("div", { className: "dsh-ma-model-head" }, shape === "record" ? e$6("input", {
				className: "dsh-ma-input",
				style: { maxWidth: "320px" },
				value: key,
				disabled,
				placeholder: tr("models.override.idPlaceholder"),
				"aria-label": tr("models.override.idPlaceholder"),
				onChange: (event) => {
					const next = {};
					for (const [id, entry] of Object.entries(record)) next[id === key ? event.target.value : id] = entry;
					onChange(next);
				}
			}) : e$6("span", { className: "dsh-ma-model-title" }, model.id || tr("models.item.fallback", { index: index + 1 })), e$6("div", { className: "dsh-ma-toolbar" }, e$6("button", {
				type: "button",
				className: "dsh-ma-button dsh-ma-icon",
				disabled,
				title: tr("models.action.clone"),
				"aria-label": tr("models.action.clone"),
				onClick: () => {
					const copied = clone(model);
					if (copied.id) copied.id = uniqueCopyId(copied.id, taken);
					insertAfter(key, copied);
				}
			}, e$6(_deepseek_ai_dsh_client_ui_primitives.IconCopyOutlineRegular, { size: 16 })), e$6("button", {
				type: "button",
				className: "dsh-ma-button dsh-ma-icon",
				disabled,
				title: tr("models.action.remove"),
				"aria-label": tr("models.action.remove"),
				onClick: () => removeAt(key)
			}, e$6(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 16 })))), e$6(ModelFields, {
				model,
				fields,
				api,
				disabled,
				onChange: (next) => replaceAt(key, next)
			}))), e$6("div", {
				className: "dsh-ma-toolbar",
				style: { marginTop: "8px" }
			}, e$6("button", {
				type: "button",
				className: "dsh-ma-button",
				disabled,
				onClick: add
			}, e$6(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutlineRegular, { size: 14 }), tr(addKey ?? "models.action.add")), shape === "array" && probe ? e$6("button", {
				type: "button",
				className: "dsh-ma-button",
				disabled: disabled || !probe.provider && !probe.baseURL,
				onClick: () => setDiscovering(true)
			}, tr("models.discovery.open")) : null), discovering && probe ? e$6(ModelDiscoveryDialog, {
				probe,
				existing: taken,
				onClose: () => setDiscovering(false),
				onApply: (models) => {
					const known = new Set(taken);
					const additions = [];
					for (const model of models) {
						if (!model.id || known.has(model.id)) continue;
						known.add(model.id);
						additions.push(discoveredModelProfile(model));
					}
					onChange([...list, ...additions]);
					setDiscovering(false);
				}
			}) : null);
		}
		//#endregion
		//#region src/client/validation.ts
		function numberError(value, key, errors, min, max, integer) {
			if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max || integer && !Number.isInteger(value)) errors.push(tr("validation.number", { field: tr(key) }));
		}
		/**
		* Validate one route's `compat` dict against the protocol it will run on.
		*
		* The field set and each field's kind come from `./compat.ts`, the same table
		* the editor renders and the save path filters with, so a field cannot be
		* offered, written and then rejected (or accepted for a protocol that ignores
		* it, which is what a protocol-blind validator let through).
		* @param value - the drafted compat dict.
		* @param path - field label used in the messages.
		* @param errors - collected failures.
		* @param api - the route's wire protocol; unset takes the adapter's default.
		*/
		function validateCompat(value, path, errors, api) {
			if (!isObject(value)) {
				errors.push(tr("validation.object", { field: path }));
				return;
			}
			for (const field of compatFields(api)) {
				if (!owns(value, field.key)) continue;
				const entry = value[field.key];
				const label = `${path}.${field.key}`;
				if (field.kind === "boolean") {
					if (typeof entry !== "boolean") errors.push(tr("validation.invalid", { field: label }));
				} else if (field.kind === "enum") {
					if (!(field.choices ?? []).includes(String(entry))) errors.push(tr("validation.invalid", { field: label }));
				} else if (field.kind === "integer") numberError(entry, label, errors, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, true);
				else if (!isObject(entry)) errors.push(tr("validation.object", { field: label }));
			}
		}
		function validateReasoningEfforts(value, path, errors) {
			if (value === false) return;
			if (!isObject(value) || Object.keys(value).length === 0) {
				errors.push(tr("validation.efforts"));
				return;
			}
			for (const [level, wire] of Object.entries(value)) {
				if (!THINKING_LEVELS.includes(level)) errors.push(tr("validation.invalid", { field: `${path}.${level}` }));
				if (level === "off") {
					if (wire !== null && typeof wire !== "string") errors.push(tr("validation.invalid", { field: `${path}.off` }));
				} else if (typeof wire !== "string" || wire.trim().length === 0) errors.push(tr("validation.invalid", { field: `${path}.${level}` }));
			}
		}
		function validateModel(model, path, requireId = true, api) {
			const errors = [];
			if (!isObject(model)) return [tr("validation.object", { field: path })];
			if (requireId && (typeof model.id !== "string" || model.id.trim().length === 0)) errors.push(tr("validation.modelId", { index: path }));
			for (const field of ["contextWindow", "maxTokens"]) if (owns(model, field)) numberError(model[field], `field.${field}`, errors, 1, Number.MAX_SAFE_INTEGER, true);
			if (owns(model, "input") && (!Array.isArray(model.input) || model.input.some((item) => !MODALITIES.includes(item)))) errors.push(tr("validation.modalities"));
			if (owns(model, "reasoningEfforts")) validateReasoningEfforts(model.reasoningEfforts, `${path}.reasoningEfforts`, errors);
			if (owns(model, "compat")) validateCompat(model.compat, `${path}.compat`, errors, api);
			return errors;
		}
		function validateRetryPolicy(value) {
			const errors = [];
			if (!isObject(value) || value.mode !== "normal" && value.mode !== "always") return [tr("validation.retry")];
			if (value.backoff !== void 0 && !isObject(value.backoff)) return [tr("validation.retry")];
			const backoff = isObject(value.backoff) ? value.backoff : {};
			for (const [field, min, max] of [
				[
					"initialDelayMs",
					Number.MIN_VALUE,
					MAX_TIMER_DELAY_MS
				],
				[
					"maxDelayMs",
					Number.MIN_VALUE,
					MAX_TIMER_DELAY_MS
				],
				[
					"jitterRatio",
					0,
					1
				]
			]) if (owns(backoff, field)) numberError(backoff[field], `field.${field}`, errors, min, max, false);
			if (owns(backoff, "initialDelayMs") && owns(backoff, "maxDelayMs") && Number(backoff.initialDelayMs) > Number(backoff.maxDelayMs)) errors.push(tr("validation.backoffOrder"));
			if (value.mode === "normal") {
				if (owns(value, "maxRetries")) numberError(value.maxRetries, "field.maxRetries", errors, 0, Number.MAX_SAFE_INTEGER, true);
				if (owns(value, "retryableCodes") && (!Array.isArray(value.retryableCodes) || value.retryableCodes.length === 0 || value.retryableCodes.some((code) => typeof code !== "string" || code.trim().length === 0) || new Set(value.retryableCodes).size !== value.retryableCodes.length)) errors.push(tr("validation.retryCodes"));
			}
			return errors;
		}
		/**
		* Validate one pi-ai provider profile before a write.
		*
		* `apiKeyEnv` stays optional by design: DSH 0.2.1 reports the authentication a
		* route performs without a credential reference (`nativeAuth`), so a keyless
		* route is a complete configuration, not an unfinished one. Only a reference
		* that IS present must be a legal environment-variable name.
		* @param profile - the profile about to be written.
		* @returns the localized failures; empty when the profile may be saved.
		*/
		function validateProfile(profile) {
			const errors = [];
			if (!isObject(profile)) return [tr("validation.object", { field: tr("provider.label") })];
			/** The drafted protocol: `compat` is judged against the route that will run it. */
			const api = typeof profile.api === "string" ? profile.api : void 0;
			if (owns(profile, "apiKeyEnv") && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(String(profile.apiKeyEnv))) errors.push(tr("validation.credentialRef"));
			for (const field of ["displayName", "baseURL"]) if (owns(profile, field) && (typeof profile[field] !== "string" || profile[field].trim().length === 0)) errors.push(tr("validation.invalid", { field: tr(`field.${field}`) }));
			if (owns(profile, "api") && !PROTOCOLS.includes(profile.api)) errors.push(tr("validation.protocol"));
			for (const field of ["defaultContextWindow", "defaultMaxTokens"]) if (owns(profile, field)) numberError(profile[field], `field.${field}`, errors, 1, Number.MAX_SAFE_INTEGER, true);
			if (owns(profile, "defaultInput") && (!Array.isArray(profile.defaultInput) || profile.defaultInput.length === 0 || profile.defaultInput.some((item) => !MODALITIES.includes(item)))) errors.push(tr("validation.modalitiesRequired"));
			if (owns(profile, "headers") && (!isObject(profile.headers) || Object.entries(profile.headers).some(([key, value]) => key.trim().length === 0 || typeof value !== "string"))) errors.push(tr("validation.headers"));
			if (owns(profile, "reasoning") && !THINKING_LEVELS.includes(profile.reasoning)) errors.push(tr("validation.reasoning"));
			if (owns(profile, "thinkingBudgets")) {
				if (!isObject(profile.thinkingBudgets)) errors.push(tr("validation.budgets"));
				else for (const [level, value] of Object.entries(profile.thinkingBudgets)) if (!BUDGET_LEVELS.includes(level)) errors.push(tr("validation.budgetLevel", { level }));
				else numberError(value, `field.${level}`, errors, 0, Number.MAX_SAFE_INTEGER, true);
			}
			if (owns(profile, "cacheRetention") && !CACHE_RETENTIONS.includes(profile.cacheRetention)) errors.push(tr("validation.cacheRetention"));
			if (owns(profile, "transport") && !TRANSPORTS.includes(profile.transport)) errors.push(tr("validation.transport"));
			for (const field of ["timeoutMs", "websocketConnectTimeoutMs"]) if (owns(profile, field)) numberError(profile[field], `field.${field}`, errors, 0, Number.MAX_SAFE_INTEGER, true);
			if (owns(profile, "streamIdleTimeoutMs")) numberError(profile.streamIdleTimeoutMs, "field.streamIdleTimeoutMs", errors, Number.MIN_VALUE, MAX_TIMER_DELAY_MS, false);
			for (const field of [
				"maxRequestImageBytes",
				"requestImagePixelBudget",
				"requestImageMaxBytes"
			]) if (owns(profile, field)) numberError(profile[field], `field.${field}`, errors, 1, Number.MAX_SAFE_INTEGER, true);
			if (owns(profile, "compat")) validateCompat(profile.compat, tr("field.compat"), errors, api);
			if (owns(profile, "retryPolicy")) errors.push(...validateRetryPolicy(profile.retryPolicy));
			if (owns(profile, "models")) {
				if (!Array.isArray(profile.models)) errors.push(tr("validation.models"));
				else {
					const ids = /* @__PURE__ */ new Set();
					profile.models.forEach((entry, index) => {
						errors.push(...validateModel(entry, tr("modelIndex", { index: index + 1 }), true, api));
						if (isObject(entry) && typeof entry.id === "string") {
							if (ids.has(entry.id)) errors.push(tr("validation.duplicateModel", { id: entry.id }));
							ids.add(entry.id);
						}
					});
				}
			}
			if (owns(profile, "modelOverrides")) {
				if (!isObject(profile.modelOverrides)) errors.push(tr("validation.overrides"));
				else for (const [id, entry] of Object.entries(profile.modelOverrides)) errors.push(...validateModel(entry, tr("overrideId", { id }), false, api));
			}
			if (owns(profile, "models") && owns(profile, "modelOverrides")) errors.push(tr("validation.catalogConflict"));
			return errors;
		}
		function validateOfficialProfile(profile) {
			const errors = [];
			if (!isObject(profile)) return [tr("validation.object", { field: tr("official.title") })];
			if (owns(profile, "apiKeyEnv") && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(String(profile.apiKeyEnv))) errors.push(tr("validation.credentialRef"));
			if (owns(profile, "baseURL") && (typeof profile.baseURL !== "string" || profile.baseURL.trim().length === 0)) errors.push(tr("validation.invalid", { field: tr("field.baseURL") }));
			if (owns(profile, "thinking") && !OFFICIAL_THINKING.includes(String(profile.thinking))) errors.push(tr("validation.invalid", { field: tr("field.thinking") }));
			if (owns(profile, "reasoningEffort") && !OFFICIAL_REASONING.includes(String(profile.reasoningEffort))) errors.push(tr("validation.invalid", { field: tr("field.reasoningEffort") }));
			if (profile.thinking === "disabled" && owns(profile, "reasoningEffort") && profile.reasoningEffort !== "off") errors.push(tr("validation.thinkingDisabledReasoning"));
			for (const field of [
				"maxTokens",
				"defaultContextWindow",
				"maxRequestFilesBytes",
				"maxInlineRequestImageBytes",
				"maxImagesPerRequest",
				"imageOffloadByteQuantum",
				"inlineImageOffloadByteQuantum",
				"imageOffloadCountQuantum"
			]) if (owns(profile, field)) numberError(profile[field], `field.${field}`, errors, 1, Number.MAX_SAFE_INTEGER, true);
			if (owns(profile, "imageOffloadByteQuantum") && owns(profile, "maxRequestFilesBytes") && typeof profile.imageOffloadByteQuantum === "number" && typeof profile.maxRequestFilesBytes === "number" && profile.imageOffloadByteQuantum > profile.maxRequestFilesBytes) errors.push(tr("validation.quantumExceedsMax", {
				field: tr("field.imageOffloadByteQuantum"),
				max: tr("field.maxRequestFilesBytes")
			}));
			if (owns(profile, "inlineImageOffloadByteQuantum") && owns(profile, "maxInlineRequestImageBytes") && typeof profile.inlineImageOffloadByteQuantum === "number" && typeof profile.maxInlineRequestImageBytes === "number" && profile.inlineImageOffloadByteQuantum > profile.maxInlineRequestImageBytes) errors.push(tr("validation.quantumExceedsMax", {
				field: tr("field.inlineImageOffloadByteQuantum"),
				max: tr("field.maxInlineRequestImageBytes")
			}));
			if (owns(profile, "imageOffloadCountQuantum") && owns(profile, "maxImagesPerRequest") && typeof profile.imageOffloadCountQuantum === "number" && typeof profile.maxImagesPerRequest === "number" && profile.imageOffloadCountQuantum > profile.maxImagesPerRequest) errors.push(tr("validation.quantumExceedsMax", {
				field: tr("field.imageOffloadCountQuantum"),
				max: tr("field.maxImagesPerRequest")
			}));
			for (const field of ["streamIdleTimeoutMs", "filesApiTimeoutMs"]) if (owns(profile, field)) numberError(profile[field], `field.${field}`, errors, Number.MIN_VALUE, MAX_TIMER_DELAY_MS, false);
			if (owns(profile, "fileExpiresAfterSeconds")) numberError(profile.fileExpiresAfterSeconds, "field.fileExpiresAfterSeconds", errors, 3600, 2592e3, true);
			if (owns(profile, "fileRefreshMarginSeconds")) numberError(profile.fileRefreshMarginSeconds, "field.fileRefreshMarginSeconds", errors, 0, Number.MAX_SAFE_INTEGER, true);
			if (owns(profile, "fileRefreshMarginSeconds") && owns(profile, "fileExpiresAfterSeconds") && typeof profile.fileRefreshMarginSeconds === "number" && typeof profile.fileExpiresAfterSeconds === "number" && profile.fileRefreshMarginSeconds >= profile.fileExpiresAfterSeconds) errors.push(tr("validation.fileRefreshOrder"));
			if (owns(profile, "fileQuotaCleanupBatch")) numberError(profile.fileQuotaCleanupBatch, "field.fileQuotaCleanupBatch", errors, 1, 1e3, true);
			if (owns(profile, "models")) {
				if (!Array.isArray(profile.models)) errors.push(tr("validation.models"));
				else {
					const seenIds = /* @__PURE__ */ new Set();
					profile.models.forEach((entry, index) => {
						const path = tr("modelIndex", { index: index + 1 });
						if (!isObject(entry) || typeof entry.id !== "string" || entry.id.trim().length === 0) errors.push(tr("validation.modelId", { index: index + 1 }));
						else {
							if (seenIds.has(entry.id)) errors.push(tr("validation.duplicateModel", { id: entry.id }));
							seenIds.add(entry.id);
						}
						if (isObject(entry)) {
							if (owns(entry, "name") && (typeof entry.name !== "string" || entry.name.trim().length === 0)) errors.push(tr("validation.invalid", { field: `${path}.name` }));
							if (owns(entry, "systemPromptUpdate") && entry.systemPromptUpdate !== "in-history") errors.push(tr("validation.invalid", { field: `${path}.systemPromptUpdate` }));
							if (owns(entry, "toolUpdate") && !TOOL_UPDATES.includes(entry.toolUpdate)) errors.push(tr("validation.invalid", { field: `${path}.toolUpdate` }));
							for (const field of ["contextWindow", "maxTokens"]) if (owns(entry, field)) numberError(entry[field], `field.${field}`, errors, 1, Number.MAX_SAFE_INTEGER, true);
							const modalities = owns(entry, "inputModalities") ? entry.inputModalities : void 0;
							if (owns(entry, "input")) errors.push(tr("validation.invalid", { field: `${path}.input` }));
							if (modalities !== void 0) {
								if (!Array.isArray(modalities) || modalities.length === 0 || modalities.some((item) => !MODALITIES.includes(item)) || new Set(modalities).size !== modalities.length) errors.push(tr("validation.modalities"));
							}
							if (!(Array.isArray(modalities) && modalities.includes("image"))) {
								if (owns(entry, "imagePixelBudget") || owns(entry, "imageMaxBytes")) errors.push(tr("validation.textOnlyImageLimits"));
							} else {
								if (owns(entry, "imagePixelBudget")) {
									const budget = entry.imagePixelBudget;
									if (budget !== "low") numberError(budget, "field.imagePixelBudget", errors, 1, Number.MAX_SAFE_INTEGER, true);
								}
								if (owns(entry, "imageMaxBytes")) numberError(entry.imageMaxBytes, "field.imageMaxBytes", errors, 1, Number.MAX_SAFE_INTEGER, true);
							}
						}
					});
				}
			}
			if (owns(profile, "retryPolicy")) errors.push(...validateRetryPolicy(profile.retryPolicy));
			return errors;
		}
		//#endregion
		//#region src/client/providers/official-editor.ts
		const e$5 = react.createElement;
		function translatedChoices$1(values, prefix) {
			return values.map((value) => ({
				value,
				labelKey: `${prefix}.${value}`
			}));
		}
		function OfficialProviderEditor({ namespace, api, form, writable, reload }) {
			const initial = clone(namespace?.value || {});
			const [draft, setDraft] = react.useState(initial);
			const [baseline, setBaseline] = react.useState(initial);
			const [keyDraft, setKeyDraft] = react.useState("");
			const [busy, setBusy] = react.useState(false);
			const [failure, setFailure] = react.useState("");
			const [open, setOpen] = react.useState(false);
			react.useEffect(() => {
				const next = clone(namespace?.value || {});
				setDraft(next);
				setBaseline(next);
				setFailure("");
			}, [namespace.revision]);
			const keyRef = draft.apiKeyEnv || deriveKeyRef("deepseek");
			const setField = (field, value) => setDraft((current) => setIn(current, field, value));
			const ops = planReplace([], baseline, draft);
			const keyValue = keyDraft.trim();
			if (keyValue && !draft.apiKeyEnv) ops.push({
				op: "set",
				path: ["apiKeyEnv"],
				value: keyRef
			});
			const save = async () => {
				const errors = validateOfficialProfile({
					...draft,
					...keyValue && !draft.apiKeyEnv ? { apiKeyEnv: keyRef } : {}
				});
				if (errors.length) {
					setFailure(errors[0]);
					return;
				}
				setBusy(true);
				setFailure("");
				const outcome = await commit({
					form,
					ops,
					api,
					...keyValue ? { credential: {
						ref: keyRef,
						value: keyValue
					} } : {},
					reload
				});
				if (outcome.kind === "written") setKeyDraft("");
				const message = outcomeMessage(outcome);
				if (message !== void 0) setFailure(message);
				setBusy(false);
			};
			const readOnly = !writable || busy;
			return e$5("section", {
				className: "dsh-ma-provider",
				"data-settings-ns": OFFICIAL_NS
			}, e$5("div", { className: "dsh-ma-provider-head" }, e$5("div", { className: "dsh-ma-identity" }, e$5("span", { className: "dsh-ma-name" }, tr("official.title")), e$5("span", { className: "dsh-ma-route" }, OFFICIAL_NS), e$5("span", { className: "dsh-ma-tag" }, tr("official.fixed"))), e$5("button", {
				type: "button",
				className: "dsh-ma-button",
				"aria-expanded": open,
				onClick: () => setOpen((value) => !value)
			}, tr(open ? "action.collapse" : "action.expand"))), open ? e$5("div", { className: "dsh-ma-form" }, e$5("div", { className: "dsh-ma-group" }, e$5("h3", { className: "dsh-ma-group-title" }, tr("group.connection")), e$5("div", { className: "dsh-ma-grid" }, e$5(CredentialField, {
				api,
				keyRef,
				revision: namespace.revision,
				value: keyDraft,
				disabled: readOnly,
				hasNamedRef: typeof draft.apiKeyEnv === "string" && draft.apiKeyEnv.length > 0,
				onChange: (value) => setKeyDraft(String(value || ""))
			}), e$5(Field, { labelKey: "field.apiKeyEnv" }, e$5(TextInput, {
				value: draft.apiKeyEnv,
				disabled: readOnly,
				onChange: (value) => setField("apiKeyEnv", value)
			})), e$5(Field, {
				labelKey: "field.baseURL",
				wide: true
			}, e$5(TextInput, {
				value: draft.baseURL,
				disabled: readOnly,
				placeholderKey: "placeholder.officialBaseURL",
				onChange: (value) => setField("baseURL", value)
			})))), e$5("div", { className: "dsh-ma-group" }, e$5("h3", { className: "dsh-ma-group-title" }, tr("group.officialReasoning")), e$5("div", { className: "dsh-ma-grid" }, e$5(Field, { labelKey: "field.thinking" }, e$5(Select, {
				value: draft.thinking,
				choices: translatedChoices$1(OFFICIAL_THINKING, "option.thinking"),
				disabled: readOnly,
				onChange: (value) => setField("thinking", value)
			})), e$5(Field, { labelKey: "field.reasoningEffort" }, e$5(Select, {
				value: draft.reasoningEffort,
				choices: translatedChoices$1(OFFICIAL_REASONING, "option.thinking"),
				disabled: readOnly,
				onChange: (value) => setField("reasoningEffort", value)
			})), e$5(Field, { labelKey: "field.defaultContextWindow" }, e$5(CapacityInput, {
				value: draft.defaultContextWindow,
				disabled: readOnly,
				placeholderKey: "placeholder.officialDefaultContextWindow",
				ariaLabelKey: "field.defaultContextWindow",
				onChange: (value) => setField("defaultContextWindow", value)
			})), e$5(Field, { labelKey: "field.maxTokens" }, e$5(CapacityInput, {
				value: draft.maxTokens,
				disabled: readOnly,
				placeholderKey: "placeholder.officialMaxTokens",
				ariaLabelKey: "field.maxTokens",
				onChange: (value) => setField("maxTokens", value)
			})))), e$5("div", { className: "dsh-ma-group" }, e$5("h3", { className: "dsh-ma-group-title" }, tr("group.models")), e$5(ModelList, {
				value: draft.models,
				shape: "array",
				fields: OFFICIAL_MODEL_FIELDS,
				disabled: readOnly,
				onChange: (value) => setField("models", Array.isArray(value) ? value : [])
			})), e$5("div", { className: "dsh-ma-group" }, e$5("h3", { className: "dsh-ma-group-title" }, tr("group.vision")), e$5("div", { className: "dsh-ma-grid" }, e$5(Field, { labelKey: "field.maxRequestFilesBytes" }, e$5(CapacityInput, {
				value: draft.maxRequestFilesBytes,
				disabled: readOnly,
				placeholderKey: "placeholder.maxRequestFilesBytes",
				ariaLabelKey: "field.maxRequestFilesBytes",
				onChange: (value) => setField("maxRequestFilesBytes", value)
			})), e$5(Field, { labelKey: "field.maxInlineRequestImageBytes" }, e$5(CapacityInput, {
				value: draft.maxInlineRequestImageBytes,
				disabled: readOnly,
				placeholderKey: "placeholder.maxInlineRequestImageBytes",
				ariaLabelKey: "field.maxInlineRequestImageBytes",
				onChange: (value) => setField("maxInlineRequestImageBytes", value)
			})), e$5(Field, { labelKey: "field.maxImagesPerRequest" }, e$5(TextInput, {
				type: "number",
				min: 1,
				step: 1,
				value: draft.maxImagesPerRequest,
				disabled: readOnly,
				placeholderKey: "placeholder.maxImagesPerRequest",
				onChange: (value) => setField("maxImagesPerRequest", value)
			})), e$5(Field, { labelKey: "field.filesApiTimeoutMs" }, e$5(TextInput, {
				type: "number",
				min: 1,
				max: MAX_TIMER_DELAY_MS,
				value: draft.filesApiTimeoutMs,
				disabled: readOnly,
				placeholderKey: "placeholder.filesApiTimeoutMs",
				onChange: (value) => setField("filesApiTimeoutMs", value)
			})), e$5(Field, { labelKey: "field.imageOffloadByteQuantum" }, e$5(CapacityInput, {
				value: draft.imageOffloadByteQuantum,
				disabled: readOnly,
				placeholderKey: "placeholder.imageOffloadByteQuantum",
				ariaLabelKey: "field.imageOffloadByteQuantum",
				onChange: (value) => setField("imageOffloadByteQuantum", value)
			})), e$5(Field, { labelKey: "field.inlineImageOffloadByteQuantum" }, e$5(CapacityInput, {
				value: draft.inlineImageOffloadByteQuantum,
				disabled: readOnly,
				placeholderKey: "placeholder.inlineImageOffloadByteQuantum",
				ariaLabelKey: "field.inlineImageOffloadByteQuantum",
				onChange: (value) => setField("inlineImageOffloadByteQuantum", value)
			})), e$5(Field, { labelKey: "field.imageOffloadCountQuantum" }, e$5(TextInput, {
				type: "number",
				min: 1,
				step: 1,
				value: draft.imageOffloadCountQuantum,
				disabled: readOnly,
				placeholderKey: "placeholder.imageOffloadCountQuantum",
				onChange: (value) => setField("imageOffloadCountQuantum", value)
			})), e$5(Field, { labelKey: "field.fileExpiresAfterSeconds" }, e$5(TextInput, {
				type: "number",
				min: 3600,
				max: 2592e3,
				step: 1,
				value: draft.fileExpiresAfterSeconds,
				disabled: readOnly,
				placeholderKey: "placeholder.fileExpiresAfterSeconds",
				onChange: (value) => setField("fileExpiresAfterSeconds", value)
			})), e$5(Field, { labelKey: "field.fileRefreshMarginSeconds" }, e$5(TextInput, {
				type: "number",
				min: 0,
				step: 1,
				value: draft.fileRefreshMarginSeconds,
				disabled: readOnly,
				placeholderKey: "placeholder.fileRefreshMarginSeconds",
				onChange: (value) => setField("fileRefreshMarginSeconds", value)
			})), e$5(Field, { labelKey: "field.fileQuotaCleanupBatch" }, e$5(TextInput, {
				type: "number",
				min: 1,
				max: 1e3,
				step: 1,
				value: draft.fileQuotaCleanupBatch,
				disabled: readOnly,
				placeholderKey: "placeholder.fileQuotaCleanupBatch",
				onChange: (value) => setField("fileQuotaCleanupBatch", value)
			})))), e$5("div", { className: "dsh-ma-group" }, e$5("h3", { className: "dsh-ma-group-title" }, tr("group.flowRetry")), e$5("div", { className: "dsh-ma-grid" }, e$5(Field, { labelKey: "field.streamIdleTimeoutMs" }, e$5(TextInput, {
				type: "number",
				min: 1,
				max: MAX_TIMER_DELAY_MS,
				value: draft.streamIdleTimeoutMs,
				disabled: readOnly,
				onChange: (value) => setField("streamIdleTimeoutMs", value)
			})), e$5(Field, {
				labelKey: "field.retryPolicy",
				wide: true
			}, e$5(RetryPolicy, {
				value: draft.retryPolicy,
				disabled: readOnly,
				onChange: (value) => setField("retryPolicy", value)
			})))), failure ? e$5("p", {
				className: "dsh-ma-status dsh-ma-error",
				role: "alert"
			}, failure) : null, e$5("div", { className: "dsh-ma-actions" }, e$5("button", {
				type: "button",
				className: "dsh-ma-button",
				disabled: readOnly || !ops.length,
				onClick: () => {
					setDraft(clone(baseline));
					setFailure("");
				}
			}, tr("action.undo")), e$5("button", {
				type: "button",
				className: "dsh-ma-button dsh-ma-primary",
				disabled: readOnly || !ops.length,
				onClick: save
			}, tr(busy ? "action.saving" : "action.apply")))) : null);
		}
		//#endregion
		//#region src/client/providers/provider-editor.ts
		const e$4 = react.createElement;
		function translatedChoices(values, prefix) {
			return values.map((value) => ({
				value,
				labelKey: `${prefix}.${value}`
			}));
		}
		/**
		* The endpoint this route uses when the profile sets no `baseURL`: the
		* adapter's fixed default, or the environment variables that build it. DSH
		* 0.2.1 added both facts to the configurable-provider directory, and showing
		* them stops an empty field from looking like a missing endpoint.
		* @param row - one directory row.
		* @returns the placeholder text, or undefined when the route declares neither.
		*/
		function inheritedEndpoint(row) {
			if (row.defaultBaseURL !== void 0) return row.defaultBaseURL;
			if (row.baseURLEnv !== void 0 && row.baseURLEnv.length > 0) return row.baseURLEnv.map((name) => `\${${name}}`).join(" / ");
		}
		function ProviderEditor({ row, api, namespace, form, writable, reload }) {
			const initial = initialEditorState(namespace, row.settingsPath);
			const [open, setOpen] = react.useState(false);
			const [draft, setDraft] = react.useState(initial.profile);
			const [explicit, setExplicit] = react.useState(initial.explicit);
			const [baseline, setBaseline] = react.useState(initial);
			const [failure, setFailure] = react.useState("");
			const [busy, setBusy] = react.useState(false);
			const [deleteConfirm, setDeleteConfirm] = react.useState(false);
			const [keyDraft, setKeyDraft] = react.useState("");
			react.useEffect(() => {
				const next = initialEditorState(namespace, row.settingsPath);
				setDraft(next.profile);
				setExplicit(next.explicit);
				setBaseline(next);
				setFailure("");
			}, [namespace.revision, row.provider]);
			const readOnly = !writable || busy;
			const keyRef = typeof draft.apiKeyEnv === "string" && draft.apiKeyEnv ? draft.apiKeyEnv : deriveKeyRef(row.provider);
			const keyValue = keyDraft.trim();
			const setField = (field, value) => {
				setDraft((current) => setIn(current, field, value));
				setExplicit((current) => ({
					...current,
					[field]: true
				}));
			};
			const field = (name, child, wide) => e$4(Field, {
				key: name,
				labelKey: `field.${name}`,
				enabled: explicit[name] === true,
				readOnly,
				wide,
				onEnabled: (enabled) => setExplicit((current) => ({
					...current,
					[name]: enabled
				}))
			}, child);
			const plan = planSave({
				row,
				draft,
				baseline,
				explicit,
				keyValue,
				keyRef,
				chosen: profileFieldChoices()
			});
			const save = async () => {
				const errors = validateProfile(plan.profile);
				if (errors.length) {
					setFailure(errors[0]);
					return;
				}
				setBusy(true);
				setFailure("");
				const outcome = await commit({
					form,
					ops: plan.ops,
					api,
					...plan.credential === void 0 ? {} : { credential: plan.credential },
					reload
				});
				if (outcome.kind === "written") setKeyDraft("");
				const message = outcomeMessage(outcome);
				if (message !== void 0) setFailure(message);
				setBusy(false);
			};
			const remove = async () => {
				setBusy(true);
				setFailure("");
				const message = outcomeMessage(await removeProfile({
					form,
					api,
					path: row.settingsPath,
					...typeof draft.apiKeyEnv === "string" && draft.apiKeyEnv ? { credentialRef: draft.apiKeyEnv } : {},
					reload
				}));
				if (message !== void 0) setFailure(message);
				setBusy(false);
			};
			const customFields = e$4(react.Fragment, null, row.error ? e$4("p", {
				className: "dsh-ma-status dsh-ma-error",
				role: "alert"
			}, row.error) : null, e$4("div", { className: "dsh-ma-group" }, e$4("h3", { className: "dsh-ma-group-title" }, tr("group.connection")), e$4("div", { className: "dsh-ma-grid" }, field("displayName", e$4(TextInput, {
				value: draft.displayName,
				disabled: !explicit.displayName || readOnly,
				onChange: (value) => setField("displayName", value)
			})), field("apiKeyEnv", e$4(TextInput, {
				value: draft.apiKeyEnv,
				disabled: !explicit.apiKeyEnv || readOnly,
				placeholderKey: "placeholder.credentialRef",
				onChange: (value) => setField("apiKeyEnv", value)
			})), e$4(CredentialField, {
				api,
				keyRef,
				revision: namespace.revision,
				value: keyDraft,
				disabled: readOnly,
				nativeAuth: row.nativeAuth,
				credentialChecks: row.credentialChecks,
				hasNamedRef: typeof draft.apiKeyEnv === "string" && draft.apiKeyEnv.length > 0,
				onChange: (value) => setKeyDraft(String(value || ""))
			}), e$4(Field, {
				key: "api",
				labelKey: "field.api",
				readOnly
			}, e$4(ProtocolSelect, {
				value: draft.api || "openai-completions",
				disabled: readOnly,
				onChange: (value) => setField("api", value)
			})), field("baseURL", e$4(TextInput, {
				value: draft.baseURL,
				disabled: !explicit.baseURL || readOnly,
				placeholder: inheritedEndpoint(row),
				placeholderKey: row.defaultBaseURL === void 0 && (row.baseURLEnv === void 0 || row.baseURLEnv.length === 0) ? "placeholder.baseURL" : void 0,
				onChange: (value) => setField("baseURL", value)
			}), true))), e$4("div", { className: "dsh-ma-group" }, e$4("h3", { className: "dsh-ma-group-title" }, tr("group.capacity")), e$4("div", { className: "dsh-ma-grid dsh-ma-grid-3" }, field("defaultContextWindow", e$4(CapacityInput, {
				value: draft.defaultContextWindow,
				disabled: !explicit.defaultContextWindow || readOnly,
				placeholderKey: "placeholder.defaultContextWindow",
				ariaLabelKey: "field.defaultContextWindow",
				onChange: (value) => setField("defaultContextWindow", value)
			})), field("defaultMaxTokens", e$4(CapacityInput, {
				value: draft.defaultMaxTokens,
				disabled: !explicit.defaultMaxTokens || readOnly,
				placeholderKey: "placeholder.defaultMaxTokens",
				ariaLabelKey: "field.defaultMaxTokens",
				onChange: (value) => setField("defaultMaxTokens", value)
			})), field("defaultInput", e$4(Modalities, {
				value: draft.defaultInput,
				disabled: !explicit.defaultInput || readOnly,
				onChange: (value) => setField("defaultInput", value)
			})), field("maxRequestImageBytes", e$4(CapacityInput, {
				value: draft.maxRequestImageBytes,
				disabled: !explicit.maxRequestImageBytes || readOnly,
				placeholderKey: "placeholder.maxRequestImageBytes",
				ariaLabelKey: "field.maxRequestImageBytes",
				onChange: (value) => setField("maxRequestImageBytes", value)
			})), field("requestImagePixelBudget", e$4(CapacityInput, {
				value: draft.requestImagePixelBudget,
				disabled: !explicit.requestImagePixelBudget || readOnly,
				placeholderKey: "placeholder.requestImagePixelBudget",
				ariaLabelKey: "field.requestImagePixelBudget",
				onChange: (value) => setField("requestImagePixelBudget", value)
			})), field("requestImageMaxBytes", e$4(CapacityInput, {
				value: draft.requestImageMaxBytes,
				disabled: !explicit.requestImageMaxBytes || readOnly,
				placeholderKey: "placeholder.requestImageMaxBytes",
				ariaLabelKey: "field.requestImageMaxBytes",
				onChange: (value) => setField("requestImageMaxBytes", value)
			})))), e$4("div", { className: "dsh-ma-group" }, e$4("h3", { className: "dsh-ma-group-title" }, tr("group.reasoning")), e$4("div", { className: "dsh-ma-grid" }, field("reasoning", e$4(Select, {
				value: draft.reasoning,
				choices: translatedChoices(THINKING_LEVELS, "option.thinking"),
				disabled: !explicit.reasoning || readOnly,
				onChange: (value) => setField("reasoning", value)
			})), field("cacheRetention", e$4(Select, {
				value: draft.cacheRetention,
				choices: translatedChoices(CACHE_RETENTIONS, "option.cache"),
				disabled: !explicit.cacheRetention || readOnly,
				onChange: (value) => setField("cacheRetention", value)
			})), field("thinkingBudgets", e$4("div", { className: "dsh-ma-subgrid" }, BUDGET_LEVELS.map((level) => e$4("label", {
				className: "dsh-ma-field",
				key: level
			}, e$4("span", { className: "dsh-ma-field-label" }, tr(`option.thinking.${level}`)), e$4(TextInput, {
				type: "number",
				min: 0,
				step: 1,
				value: isObject(draft.thinkingBudgets) ? draft.thinkingBudgets[level] : void 0,
				disabled: !explicit.thinkingBudgets || readOnly,
				onChange: (value) => {
					const next = { ...isObject(draft.thinkingBudgets) ? draft.thinkingBudgets : {} };
					if (value === void 0) delete next[level];
					else next[level] = value;
					setField("thinkingBudgets", next);
				}
			})))), true), field("compat", e$4(CompatEditor, {
				value: draft.compat,
				api: draft.api,
				titleKey: "field.compat",
				disabled: !explicit.compat || readOnly,
				onChange: (value) => setField("compat", value)
			}), true))), e$4("div", { className: "dsh-ma-group" }, e$4("h3", { className: "dsh-ma-group-title" }, tr("group.transport")), e$4("div", { className: "dsh-ma-grid dsh-ma-grid-3" }, field("transport", e$4(Select, {
				value: draft.transport,
				choices: translatedChoices(TRANSPORTS, "option.transport"),
				disabled: !explicit.transport || readOnly,
				onChange: (value) => setField("transport", value)
			})), ...[
				"timeoutMs",
				"websocketConnectTimeoutMs",
				"streamIdleTimeoutMs"
			].map((name) => field(name, e$4(TextInput, {
				type: "number",
				min: name === "streamIdleTimeoutMs" ? 1 : 0,
				value: draft[name],
				disabled: !explicit[name] || readOnly,
				onChange: (value) => setField(name, value)
			}))))), e$4("div", { className: "dsh-ma-group" }, field("headers", e$4(KeyValueList, {
				kind: "headers",
				value: draft.headers,
				disabled: !explicit.headers || readOnly,
				onChange: (value) => setField("headers", value)
			}), true)), e$4("div", { className: "dsh-ma-group" }, field("retryPolicy", e$4(RetryPolicy, {
				value: draft.retryPolicy,
				disabled: !explicit.retryPolicy || readOnly,
				onChange: (value) => setField("retryPolicy", value)
			}), true)), e$4("div", { className: "dsh-ma-group" }, field("models", e$4(ModelList, {
				value: draft.models,
				shape: "array",
				fields: PI_AI_MODEL_FIELDS,
				disabled: !explicit.models || readOnly,
				api: draft.api,
				probe: {
					clientApi: api,
					provider: row.provider,
					baseURL: draft.baseURL,
					api: draft.api,
					apiKey: keyValue || void 0
				},
				onChange: (value) => setField("models", value)
			}), true)));
			const builtInFields = e$4("div", { className: "dsh-ma-group" }, e$4("h3", { className: "dsh-ma-group-title" }, tr("group.overrides")), explicit.models && explicit.modelOverrides ? e$4("div", { className: "dsh-ma-notice" }, tr("validation.catalogConflict")) : null, field("modelOverrides", e$4(ModelList, {
				shape: "record",
				fields: PI_AI_MODEL_FIELDS,
				addKey: "models.action.addOverride",
				value: draft.modelOverrides,
				disabled: !explicit.modelOverrides || explicit.models || readOnly,
				api: draft.api,
				onChange: (value) => setField("modelOverrides", value)
			}), true));
			return e$4("section", {
				className: "dsh-ma-provider",
				"data-settings-ns": SETTINGS_NS
			}, e$4("div", { className: "dsh-ma-provider-head" }, e$4("div", { className: "dsh-ma-identity" }, e$4("span", { className: "dsh-ma-name" }, row.displayName), e$4("span", { className: "dsh-ma-route" }, row.provider), e$4("span", { className: "dsh-ma-tag" }, tr(row.declared ? "provider.custom" : "provider.builtIn"))), row.userAdded ? e$4("button", {
				type: "button",
				className: "dsh-ma-button",
				disabled: readOnly,
				onClick: () => setDeleteConfirm(true)
			}, tr("action.delete")) : null, e$4("button", {
				type: "button",
				className: "dsh-ma-button",
				"aria-expanded": open,
				onClick: () => setOpen((value) => !value)
			}, tr(open ? "action.collapse" : "action.edit"))), deleteConfirm ? e$4("div", {
				className: "dsh-ma-delete-confirm",
				role: "alert"
			}, e$4("p", null, tr(draft.apiKeyEnv ? "delete.withCredential" : "delete.providerOnly", { ref: draft.apiKeyEnv || "" })), e$4("div", { className: "dsh-ma-actions" }, e$4("button", {
				type: "button",
				className: "dsh-ma-button",
				disabled: busy,
				onClick: () => setDeleteConfirm(false)
			}, tr("action.cancel")), e$4("button", {
				type: "button",
				className: "dsh-ma-button dsh-ma-primary",
				disabled: readOnly,
				onClick: remove
			}, tr("action.confirmDelete")))) : null, open ? e$4("div", { className: "dsh-ma-form" }, customFields, row.declared ? null : builtInFields, failure ? e$4("p", {
				className: "dsh-ma-status dsh-ma-error",
				role: "alert"
			}, failure) : null, e$4("div", { className: "dsh-ma-actions" }, e$4("button", {
				type: "button",
				className: "dsh-ma-button",
				disabled: readOnly || !plan.ops.length,
				onClick: () => {
					setDraft(clone(baseline.profile));
					setExplicit({ ...baseline.explicit });
					setFailure("");
				}
			}, tr("action.undo")), e$4("button", {
				type: "button",
				className: "dsh-ma-button dsh-ma-primary",
				disabled: readOnly || !plan.ops.length,
				onClick: save
			}, tr(busy ? "action.saving" : "action.apply")))) : null);
		}
		//#endregion
		//#region src/client/providers/custom-provider.ts
		const e$3 = react.createElement;
		function CreateCustomProvider({ rows, form, writable, reload, close }) {
			const [route, setRoute] = react.useState("");
			const [displayName, setDisplayName] = react.useState("");
			const [protocol, setProtocol] = react.useState("openai-completions");
			const [baseURL, setBaseURL] = react.useState("");
			const [catalog, setCatalog] = react.useState([{ id: "" }]);
			const [failure, setFailure] = react.useState("");
			const [busy, setBusy] = react.useState(false);
			const submit = async () => {
				const profile = stripModelCompat({
					api: protocol,
					baseURL,
					models: catalog
				}, protocol);
				if (displayName.trim()) profile.displayName = displayName.trim();
				const errors = [
					.../^[a-z][a-z0-9-]*$/.test(route) ? [] : [tr("validation.route")],
					...rows.some((row) => row.provider === route) ? [tr("validation.duplicateProvider")] : [],
					...validateProfile(profile)
				];
				if (errors.length) {
					setFailure(errors[0]);
					return;
				}
				setBusy(true);
				setFailure("");
				try {
					if (!await writeOps(form, [{
						op: "set",
						path: ["providers", route],
						value: profile
					}])) {
						setFailure(conflictMessage());
						return;
					}
					await reload();
					close();
				} catch (error) {
					setFailure(responseMessage(error));
				} finally {
					setBusy(false);
				}
			};
			const disabled = !writable || busy;
			return e$3("section", {
				className: "dsh-ma-create",
				"data-settings-ns": SETTINGS_NS
			}, e$3("h3", { className: "dsh-ma-group-title" }, tr("custom.title")), e$3("div", { className: "dsh-ma-grid" }, e$3(Field, { labelKey: "field.routeId" }, e$3(TextInput, {
				value: route,
				disabled,
				placeholderKey: "placeholder.providerId",
				onChange: (value) => setRoute(String(value || ""))
			})), e$3(Field, { labelKey: "field.displayName" }, e$3(TextInput, {
				value: displayName,
				disabled,
				placeholderKey: "placeholder.displayName",
				onChange: (value) => setDisplayName(String(value || ""))
			})), e$3(Field, { labelKey: "field.api" }, e$3(ProtocolSelect, {
				value: protocol,
				disabled,
				onChange: (value) => setProtocol(value || "openai-completions")
			})), e$3(Field, {
				labelKey: "field.baseURL",
				wide: true
			}, e$3(TextInput, {
				value: baseURL,
				disabled,
				placeholderKey: "placeholder.baseURL",
				onChange: (value) => setBaseURL(String(value || ""))
			}))), e$3(Field, {
				labelKey: "field.models",
				wide: true
			}, e$3(ModelList, {
				value: catalog,
				shape: "array",
				fields: PI_AI_MODEL_FIELDS,
				disabled,
				api: protocol,
				onChange: (value) => setCatalog(Array.isArray(value) ? value : [])
			})), failure ? e$3("p", {
				className: "dsh-ma-status dsh-ma-error",
				role: "alert"
			}, failure) : null, e$3("div", { className: "dsh-ma-actions" }, e$3("button", {
				type: "button",
				className: "dsh-ma-button",
				disabled: busy,
				onClick: close
			}, tr("action.cancel")), e$3("button", {
				type: "button",
				className: "dsh-ma-button dsh-ma-primary",
				disabled,
				onClick: submit
			}, tr(busy ? "action.creating" : "action.createProvider"))));
		}
		//#endregion
		//#region src/client/providers/builtin-provider.ts
		const e$2 = react.createElement;
		function AddBuiltInProvider({ rows, form, writable, reload, close }) {
			const available = rows.filter((row) => row.declared !== true && !row.userAdded);
			const [provider, setProvider] = react.useState(available[0]?.provider || "");
			const [failure, setFailure] = react.useState("");
			const [busy, setBusy] = react.useState(false);
			const selected = available.find((row) => row.provider === provider);
			const submit = async () => {
				if (!selected) {
					setFailure(tr("validation.noBuiltIn"));
					return;
				}
				setBusy(true);
				setFailure("");
				try {
					if (!await writeOps(form, [{
						op: "set",
						path: [...selected.settingsPath],
						value: {}
					}])) {
						setFailure(conflictMessage());
						return;
					}
					await reload();
					close();
				} catch (error) {
					setFailure(responseMessage(error));
				} finally {
					setBusy(false);
				}
			};
			return e$2("section", {
				className: "dsh-ma-create",
				"data-settings-ns": SETTINGS_NS
			}, e$2("h3", { className: "dsh-ma-group-title" }, tr("builtin.title")), e$2(Field, { labelKey: "field.builtInProvider" }, e$2("select", {
				className: "dsh-ma-select",
				value: provider,
				disabled: !writable || busy || !available.length,
				onChange: (event) => setProvider(event.target.value)
			}, available.map((row) => e$2("option", {
				key: row.provider,
				value: row.provider
			}, row.displayName)))), failure ? e$2("p", {
				className: "dsh-ma-status dsh-ma-error",
				role: "alert"
			}, failure) : null, e$2("div", { className: "dsh-ma-actions" }, e$2("button", {
				type: "button",
				className: "dsh-ma-button",
				disabled: busy,
				onClick: close
			}, tr("action.cancel")), e$2("button", {
				type: "button",
				className: "dsh-ma-button dsh-ma-primary",
				disabled: !writable || busy || !selected,
				onClick: submit
			}, tr(busy ? "action.adding" : "action.addProvider"))));
		}
		//#endregion
		//#region src/client/page.ts
		const e$1 = react.createElement;
		const NS$1 = LOCALE_NS;
		/**
		* Redacted credential state for every reference a keyless route may use. A
		* route that names no `apiKeyEnv` authenticates through its own environment or
		* OAuth, so the page asks about those references instead of pretending the
		* route is missing a key.
		* @param api - the page's credential face.
		* @param rows - catalog rows carrying `nativeAuth`.
		* @returns the per-reference state, or undefined when the read failed.
		*/
		async function nativeCredentialChecks(api, rows) {
			const refs = [...new Set(rows.flatMap((row) => row.nativeAuth ? [...row.nativeAuth.env] : []))];
			if (refs.length === 0) return {};
			try {
				return valueOf(await api.credentials.describe(refs));
			} catch {
				return;
			}
		}
		/**
		* Turn one directory row into the row the editor renders, keeping every DSH
		* 0.2.1 fact (inherited endpoint, endpoint environment, native authentication,
		* catalog diagnostic) instead of dropping the ones the old wire lacked.
		*
		* The row is data only: the write faces travel beside it as props, so a row can
		* be built in a test without constructing a client.
		* @param entry - one configurable-provider directory row.
		* @param userAdded - whether the user layer carries this row's profile.
		* @returns the row the editor renders.
		*/
		function toProviderRow(entry, userAdded) {
			return {
				provider: entry.provider,
				displayName: entry.displayName,
				settingsNs: entry.settingsNs,
				settingsPath: [...entry.settingsPath],
				active: entry.active,
				declared: entry.declared,
				...entry.defaultBaseURL === void 0 ? {} : { defaultBaseURL: entry.defaultBaseURL },
				...entry.baseURLEnv === void 0 ? {} : { baseURLEnv: entry.baseURLEnv },
				...entry.nativeAuth === void 0 ? {} : { nativeAuth: {
					env: [...entry.nativeAuth.env],
					oauth: entry.nativeAuth.oauth === true
				} },
				...entry.error === void 0 ? {} : { error: entry.error },
				userAdded
			};
		}
		function AdvancedModelsPage({ api, describe, configForms }) {
			const [state, setState] = react.useState({
				status: "loading",
				writable: false,
				rows: [],
				catalogRows: [],
				namespace: void 0,
				officialNamespace: void 0,
				error: ""
			});
			const [createMode, setCreateMode] = react.useState(void 0);
			const load = async () => {
				const snapshot = describe.getSnapshot();
				if (snapshot.view === void 0) {
					setState((current) => ({
						...current,
						status: snapshot.error === null ? "loading" : "error",
						error: snapshot.error ?? ""
					}));
					return;
				}
				setState((current) => ({
					...current,
					status: "loading",
					error: ""
				}));
				try {
					const providerList = valueOf(await api.llm.providers({})).providers;
					const namespace = namespaceView(describe, SETTINGS_NS);
					const officialNamespace = namespaceView(describe, OFFICIAL_NS);
					if (!namespace || !officialNamespace) {
						setState((current) => ({
							...current,
							status: "loading",
							error: ""
						}));
						return;
					}
					const llmRows = providerList.filter((entry) => entry.settingsNs === SETTINGS_NS).map((entry) => toProviderRow(entry, hasUserProfile(namespace, entry.settingsPath)));
					const checks = await nativeCredentialChecks(api, llmRows);
					const catalogRows = llmRows.map((row) => checks === void 0 ? row : {
						...row,
						credentialChecks: checks
					});
					setState({
						status: "ready",
						writable: describe.getSnapshot().view?.writable === true,
						rows: catalogRows.filter((entry) => entry.userAdded),
						catalogRows,
						namespace,
						officialNamespace,
						error: ""
					});
				} catch (error) {
					setState((current) => ({
						...current,
						status: "error",
						error: responseMessage(error)
					}));
				}
			};
			react.useEffect(() => {
				ensureDescribe(describe);
				load();
				return describe.subscribe(() => {
					load();
				});
			}, [describe]);
			const editorProps = (row) => ({
				key: row.provider,
				row,
				api,
				namespace: state.namespace,
				writable: state.writable,
				form: configForms.get(SETTINGS_NS),
				reload: load
			});
			return e$1("div", { className: "dsh-ma-page" }, e$1("div", { className: "dsh-ma-header" }, e$1("h2", { className: "dsh-ma-title" }, tr("title")), e$1("div", { className: "dsh-ma-toolbar" }, e$1("button", {
				type: "button",
				className: "dsh-ma-button",
				disabled: state.status === "loading",
				title: tr("refresh"),
				"aria-label": tr("refresh"),
				onClick: load
			}, e$1(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutlineRegular, { size: 16 })), e$1("button", {
				type: "button",
				className: "dsh-ma-button",
				disabled: !state.writable || state.status !== "ready",
				onClick: () => setCreateMode((value) => value === "builtin" ? void 0 : "builtin")
			}, e$1(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutlineRegular, { size: 14 }), tr("addBuiltIn")), e$1("button", {
				type: "button",
				className: "dsh-ma-button",
				disabled: !state.writable || state.status !== "ready",
				onClick: () => setCreateMode((value) => value === "custom" ? void 0 : "custom")
			}, e$1(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutlineRegular, { size: 14 }), tr("addCustom")))), !state.writable && state.status === "ready" ? e$1("div", { className: "dsh-ma-notice" }, tr("readOnly")) : null, state.status === "loading" ? e$1("p", { className: "dsh-ma-status" }, tr("loading")) : null, state.status === "error" ? e$1("p", {
				className: "dsh-ma-status dsh-ma-error",
				role: "alert"
			}, state.error) : null, createMode === "builtin" && state.namespace ? e$1(AddBuiltInProvider, {
				rows: state.catalogRows,
				form: configForms.get(SETTINGS_NS),
				writable: state.writable,
				reload: load,
				close: () => setCreateMode(void 0)
			}) : null, createMode === "custom" && state.namespace ? e$1(CreateCustomProvider, {
				rows: state.catalogRows,
				form: configForms.get(SETTINGS_NS),
				writable: state.writable,
				reload: load,
				close: () => setCreateMode(void 0)
			}) : null, e$1("div", { className: "dsh-ma-list" }, e$1("h3", { className: "dsh-ma-section-title" }, tr("builtInProviders")), state.officialNamespace ? e$1(OfficialProviderEditor, {
				namespace: state.officialNamespace,
				api,
				form: configForms.get(OFFICIAL_NS),
				writable: state.writable,
				reload: load
			}) : null, state.rows.filter((row) => row.declared !== true).map((row) => e$1(ProviderEditor, editorProps(row))), state.rows.some((row) => row.declared === true) ? e$1("h3", { className: "dsh-ma-section-title" }, tr("customProviders")) : null, state.rows.filter((row) => row.declared === true).map((row) => e$1(ProviderEditor, editorProps(row)))), state.status === "ready" && state.rows.length === 0 ? e$1("p", { className: "dsh-ma-status" }, tr("empty")) : null);
		}
		function LocalePage({ locale, ...props }) {
			const [, setRevision] = react.useState(0);
			react.useEffect(() => locale.subscribe(() => setRevision((value) => value + 1)), [locale]);
			setTranslator(locale.bind(NS$1));
			return e$1(AdvancedModelsPage, props);
		}
		//#endregion
		//#region src/client/index.ts
		const e = react.createElement;
		const NS = LOCALE_NS;
		const inject = [
			"slots",
			"locale",
			"remote",
			"remote.credentials",
			"remote.llm",
			"configForms",
			"settingsSchema"
		];
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh: flattenDictionary(zh),
				en: flattenDictionary(en)
			}), "model-advanced: locale");
			const bindTranslator = () => setTranslator(ctx.locale.bind(NS));
			bindTranslator();
			ctx.effect(() => ctx.locale.subscribe(bindTranslator), "model-advanced: locale updates");
			ctx.effect(() => {
				const style = document.createElement("style");
				style.dataset.plugin = "@local/dsh-advanced-model-editor";
				style.textContent = CSS;
				document.head.appendChild(style);
				return () => style.remove();
			}, "model-advanced: styles");
			const makeMarkSvg = () => {
				const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
				svg.setAttribute("viewBox", "0 0 24 24");
				svg.setAttribute("fill", "none");
				const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
				path.setAttribute("d", MARK_PATH);
				path.setAttribute("stroke", "currentColor");
				path.setAttribute("stroke-width", String(MARK_STROKE));
				path.setAttribute("stroke-linecap", "round");
				path.setAttribute("stroke-linejoin", "round");
				svg.appendChild(path);
				return svg;
			};
			const swapNavIcon = () => {
				const label = tr("nav");
				for (const button of document.querySelectorAll("button")) {
					const span = button.querySelector("span");
					if (!span || span.textContent !== label) continue;
					const icon = button.querySelector("svg");
					if (!icon || icon.dataset.dshMaIcon === "mark") continue;
					const mark = makeMarkSvg();
					for (const name of [
						"width",
						"height",
						"class"
					]) {
						const value = icon.getAttribute(name);
						if (value !== null) mark.setAttribute(name, value);
					}
					mark.dataset.dshMaIcon = "mark";
					icon.replaceWith(mark);
				}
			};
			ctx.effect(() => {
				swapNavIcon();
				let frame = 0;
				const observer = new MutationObserver(() => {
					if (frame !== 0) return;
					frame = requestAnimationFrame(() => {
						frame = 0;
						if (document.querySelector("[role=\"dialog\"]") !== null) swapNavIcon();
					});
				});
				observer.observe(document.body, {
					childList: true,
					subtree: true
				});
				return () => observer.disconnect();
			}, "model-advanced: nav icon");
			const api = createModelApi(ctx);
			const services = {
				configForms: ctx.configForms,
				settingsSchema: ctx.settingsSchema
			};
			const describe = ctx.configForms.describe();
			const adopt = () => {
				adoptSchemaChoices(ctx.settingsSchema, {
					llmPiAi: namespaceView(describe, SETTINGS_NS),
					llmDeepSeek: namespaceView(describe, OFFICIAL_NS)
				});
			};
			adopt();
			ctx.effect(() => describe.subscribe(adopt), "model-advanced: schema choices");
			ctx.effect(() => {
				const disposers = [
					ctx.remote.$on("credentials/reference-updated", () => void describe.ensure()),
					ctx.remote.$on("credentials/record-updated", () => void describe.ensure()),
					ctx.remote.$on("llm/adapters-updated", () => void describe.ensure()),
					ctx.on("connection/reset", () => void describe.ensure())
				];
				return () => {
					for (const dispose of disposers) dispose();
				};
			}, "model-advanced: invalidations");
			ctx.effect(() => ctx.configForms.whileServed([SETTINGS_NS, OFFICIAL_NS], () => ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "model-advanced",
				order: 11,
				label: () => tr("nav")
			}, function Page() {
				return e(LocalePage, {
					locale: ctx.locale,
					api,
					describe,
					configForms: services.configForms
				});
			}))), "model-advanced: settings section");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map