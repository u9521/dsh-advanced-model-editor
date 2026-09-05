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
		* Creates a ModelApi adapter over DSH 0.1.2+ Typert Remote services.
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
							...entry.declared !== void 0 ? { declared: entry.declared } : {}
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
				settings: {
					async describe() {
						const res = await remote.settings.describe();
						if (!res.ok) return { result: {
							ok: false,
							error: { message: res.error?.message || "Failed to describe settings" }
						} };
						return { result: {
							ok: true,
							value: res.value
						} };
					},
					async mutate(input) {
						const res = await remote.settings.mutate(input.ns, input.ops, input.expectedRevision);
						if (!res.ok) return { result: {
							ok: false,
							error: { message: res.error?.message || "Failed to mutate settings" }
						} };
						return { result: {
							ok: true,
							value: res.value
						} };
					}
				},
				credentials: {
					async describe(input) {
						const refs = Array.isArray(input) ? input : Array.isArray(input?.refs) ? input.refs : [];
						const res = await remote.credentials.describe(refs);
						if (!res.ok) return { result: {
							ok: false,
							error: { message: res.error?.message || "Failed to describe credentials" }
						} };
						return { result: {
							ok: true,
							value: {
								credentials: res.value,
								...res.value
							}
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
		const OFFICIAL_FIELDS = [
			"apiKeyEnv",
			"baseURL",
			"thinking",
			"reasoningEffort",
			"maxTokens",
			"defaultContextWindow",
			"models",
			"streamIdleTimeoutMs",
			"maxRequestFilesBytes",
			"maxInlineRequestImageBytes",
			"maxImagesPerRequest",
			"imageOffloadByteQuantum",
			"inlineImageOffloadByteQuantum",
			"imageOffloadCountQuantum",
			"filesApiTimeoutMs",
			"fileExpiresAfterSeconds",
			"fileRefreshMarginSeconds",
			"fileQuotaCleanupBatch",
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
		const CACHE_CONTROL_FORMATS = ["anthropic"];
		const PROTOCOL_COMPAT_FIELDS = {
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
				"supportsStrictMode",
				"cacheControlFormat",
				"supportsLongCacheRetention"
			],
			"openai-responses": [
				"supportsDeveloperRole",
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
		const DEFAULT_RETRYABLE_CODES = [
			"EMPTY_RESPONSE",
			"RATE_LIMIT",
			"SERVER",
			"TIMEOUT",
			"TRANSPORT"
		];
		const MAX_TIMER_DELAY_MS = 2147483647;
		//#endregion
		//#region src/client/locales/zh.ts
		const zh = {
			nav: "模型高级设置",
			title: "模型高级设置",
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
				imageDetail: "图片细节层级",
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
				deleteOnlyUserAdded: "只能删除用户添加的 llm-pi-ai Provider。",
				quantumExceedsMax: "{field}不能超过对应的上限。",
				fileRefreshOrder: "文件提前刷新时间必须小于文件有效期。",
				textOnlyImageLimits: "纯文本模型不能设置图片参数。",
				thinkingDisabledReasoning: "禁用思考时推理档位只能为 off。"
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
				notConfigured: "未配置"
			},
			delete: {
				withCredential: "删除将移除此 Provider 的配置，并清除已存储的 API 密钥引用 {ref}。若其他 Provider 也使用该引用，其密钥同样会被移除。",
				providerOnly: "删除将移除此 Provider 的配置。",
				wait: "请等待 {seconds} 秒"
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
				imageDetail: {
					auto: "自动",
					low: "低细节 (Low)"
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
					supportsStrictMode: "严格工具模式 (strict) 支持",
					cacheControlFormat: "Prompt Cache 标记格式",
					supportsLongCacheRetention: "长期提示词缓存支持",
					supportsEagerToolInputStreaming: "逐工具输入流式传输支持",
					supportsCacheControlOnTools: "工具定义 cache_control 支持",
					supportsTemperature: "temperature 参数支持",
					forceAdaptiveThinking: "强制开启自适应思考",
					allowEmptySignature: "允许空思考签名",
					supportsStrictTools: "严格工具 Schema 支持"
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
					imageDetail: "图片细节层级",
					imagePixelBudget: "单图像素预算",
					imageMaxBytes: "单图最大字节",
					reasoningEfforts: "推理档位映射",
					compat: "模型兼容性"
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
			nav: "Advanced Model Settings",
			title: "Advanced Model Settings",
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
				imageDetail: "Image detail tier",
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
				deleteOnlyUserAdded: "Only user-added llm-pi-ai providers can be deleted.",
				quantumExceedsMax: "{field} cannot exceed its corresponding limit.",
				fileRefreshOrder: "File refresh margin must be less than file expiry.",
				textOnlyImageLimits: "Text-only models cannot declare image parameters.",
				thinkingDisabledReasoning: "Reasoning effort must be off when thinking is disabled."
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
				notConfigured: "not configured"
			},
			delete: {
				withCredential: "Deleting removes this provider configuration and stored API key reference {ref}. Other providers sharing it will lose the key too.",
				providerOnly: "Deleting removes this provider configuration.",
				wait: "Wait {seconds}s"
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
				imageDetail: {
					auto: "Auto",
					low: "Low"
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
					supportsStrictMode: "Strict tool mode support",
					cacheControlFormat: "Prompt cache marker format",
					supportsLongCacheRetention: "Long cache retention support",
					supportsEagerToolInputStreaming: "Eager tool input streaming support",
					supportsCacheControlOnTools: "Cache control on tools support",
					supportsTemperature: "temperature parameter support",
					forceAdaptiveThinking: "Force adaptive thinking",
					allowEmptySignature: "Allow empty thinking signature",
					supportsStrictTools: "Strict tools support"
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
					imageDetail: "Image detail tier",
					imagePixelBudget: "Image pixel budget",
					imageMaxBytes: "Image max bytes",
					reasoningEfforts: "Reasoning effort mapping",
					compat: "Model compatibility"
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
		//#region src/client/utils.ts
		function createDefaultReasoningEfforts() {
			const result = {};
			for (const level of THINKING_LEVELS) result[level] = level === "off" ? null : level;
			return result;
		}
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
		let translate = (key) => key;
		function setTranslator(next) {
			translate = typeof next === "function" ? next : (key) => key;
		}
		function tr(key, vars) {
			let value = translate(key);
			if (typeof value !== "string") value = key;
			if (vars) for (const [name, replacement] of Object.entries(vars)) value = value.replaceAll(`{${name}}`, String(replacement));
			return value;
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
		//#region src/client/controls/field.ts
		const e$17 = react.createElement;
		function Field(props) {
			const label = tr(props.labelKey, props.labelVars);
			return e$17("div", { className: "dsh-ma-field" + (props.wide ? " dsh-ma-wide" : "") }, e$17("div", { className: "dsh-ma-field-label" }, props.onEnabled ? e$17("input", {
				className: "dsh-ma-override",
				type: "checkbox",
				checked: props.enabled === true,
				disabled: props.readOnly === true,
				"aria-label": tr("controls.field.override", { label }),
				onChange: (event) => props.onEnabled?.(event.target.checked)
			}) : null, e$17("span", null, label)), props.children);
		}
		//#endregion
		//#region src/client/controls/inputs.ts
		const e$16 = react.createElement;
		function option(value, labelKey, labelVars) {
			return e$16("option", {
				key: String(value),
				value
			}, tr(labelKey ?? "", labelVars));
		}
		function TextInput(props) {
			const type = props.type || "text";
			return e$16("input", {
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
			return e$16("input", {
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
			return e$16("select", {
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
			return e$16(Select, {
				value: props.value || "openai-completions",
				onChange: props.onChange,
				disabled: props.disabled,
				allowUnset: props.allowUnset ?? false,
				choices: [...PROTOCOLS],
				choiceKeyPrefix: "controls.protocol",
				unsetKey: props.unsetKey || "controls.select.unset",
				ariaLabelKey: props.ariaLabelKey || "controls.protocol.label"
			});
		}
		//#endregion
		//#region src/client/controls/modalities.ts
		const e$15 = react.createElement;
		function Modalities(props) {
			const selected = Array.isArray(props.value) ? props.value : [];
			return e$15("div", { className: "dsh-ma-checks" }, MODALITIES.map((item) => e$15("label", {
				key: item,
				className: "dsh-ma-check"
			}, e$15("input", {
				type: "checkbox",
				checked: selected.includes(item),
				disabled: props.disabled === true,
				onChange: (event) => props.onChange?.(event.target.checked ? [...selected, item] : selected.filter((entry) => entry !== item))
			}), tr("controls.modality." + item))));
		}
		//#endregion
		//#region src/client/controls/key-value-list.ts
		const e$14 = react.createElement;
		function KeyValueList(props) {
			const values = isObject(props.value) ? props.value : {};
			const levels = props.kind === "efforts";
			const entries = levels ? Object.entries(values).sort(([a], [b]) => {
				const indexA = THINKING_LEVELS.indexOf(a);
				const indexB = THINKING_LEVELS.indexOf(b);
				return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
			}) : Object.entries(values);
			const sortEfforts = (record) => {
				const sorted = {};
				for (const level of THINKING_LEVELS) if (Object.prototype.hasOwnProperty.call(record, level)) sorted[level] = record[level];
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
					const available = THINKING_LEVELS.find((level) => !Object.prototype.hasOwnProperty.call(values, level));
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
			return e$14("div", { className: "dsh-ma-wide" }, entries.map(([key, value], index) => e$14("div", {
				className: "dsh-ma-kv",
				key: key + "-" + index
			}, levels ? e$14(Select, {
				value: key,
				disabled: props.disabled,
				allowUnset: false,
				choices: [...THINKING_LEVELS],
				choiceKeyPrefix: "controls.reasoningLevel",
				onChange: (nextKey) => setEntry(key, nextKey, value)
			}) : e$14(TextInput, {
				value: key,
				disabled: props.disabled,
				emptyAsUndefined: false,
				placeholderKey: "controls.keyValue.headers.keyPlaceholder",
				onChange: (nextKey) => setEntry(key, nextKey, value)
			}), e$14(TextInput, {
				value: value === null ? "" : value,
				disabled: props.disabled,
				emptyAsUndefined: false,
				placeholderKey: levels && key === "off" ? "controls.keyValue.efforts.offValuePlaceholder" : levels ? "controls.keyValue.efforts.valuePlaceholder" : "controls.keyValue.headers.valuePlaceholder",
				onChange: (nextValue) => setEntry(key, key, levels && key === "off" && nextValue === "" ? null : nextValue)
			}), e$14("button", {
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
			}, e$14(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, { size: 16 })))), e$14("button", {
				type: "button",
				className: "dsh-ma-button",
				disabled: props.disabled === true || levels && entries.length === THINKING_LEVELS.length,
				style: { marginTop: "8px" },
				onClick: add
			}, e$14(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, { size: 14 }), tr(levels ? "controls.keyValue.efforts.add" : "controls.keyValue.headers.add")));
		}
		//#endregion
		//#region src/client/controls/compat-editor.ts
		const e$13 = react.createElement;
		function CompatEditor(props) {
			const [open, setOpen] = react.useState(props.defaultOpen ?? false);
			const compat = isObject(props.value) ? props.value : {};
			const set = (field, value) => {
				const next = { ...compat };
				if (value === void 0 || value === "") delete next[field];
				else next[field] = value;
				const cleanKeys = Object.entries(next).filter(([_, v]) => {
					if (v === void 0 || v === null || v === "") return false;
					if (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0) return false;
					return true;
				});
				props.onChange?.(cleanKeys.length === 0 ? void 0 : next);
			};
			const allowed = PROTOCOL_COMPAT_FIELDS[props.api || "openai-completions"] || PROTOCOL_COMPAT_FIELDS["openai-completions"];
			const configuredCount = Object.entries(compat).filter(([key, value]) => {
				if (!allowed.includes(key)) return false;
				if (value === void 0 || value === null || value === "") return false;
				if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) return false;
				return true;
			}).length;
			const boolSelect = (name, labelKey) => e$13(Field, {
				labelKey,
				key: name
			}, e$13(Select, {
				value: typeof compat[name] === "boolean" ? String(compat[name]) : void 0,
				choices: [{
					value: "true",
					labelKey: "controls.boolean.supported"
				}, {
					value: "false",
					labelKey: "controls.boolean.unsupported"
				}],
				disabled: props.disabled,
				unsetKey: "controls.select.auto",
				onChange: (value) => set(name, value === void 0 ? void 0 : value === "true")
			}));
			let gridContent = null;
			if (props.api === "anthropic-messages") gridContent = e$13("div", { className: "dsh-ma-grid" }, boolSelect("supportsTemperature", "controls.compat.supportsTemperature"), boolSelect("forceAdaptiveThinking", "controls.compat.forceAdaptiveThinking"), boolSelect("supportsEagerToolInputStreaming", "controls.compat.supportsEagerToolInputStreaming"), boolSelect("supportsCacheControlOnTools", "controls.compat.supportsCacheControlOnTools"), boolSelect("allowEmptySignature", "controls.compat.allowEmptySignature"), boolSelect("supportsStrictTools", "controls.compat.supportsStrictTools"), boolSelect("supportsLongCacheRetention", "controls.compat.supportsLongCacheRetention"));
			else if (props.api === "openai-responses") gridContent = e$13("div", { className: "dsh-ma-grid" }, boolSelect("supportsDeveloperRole", "controls.compat.supportsDeveloperRole"), boolSelect("supportsStrictMode", "controls.compat.supportsStrictMode"), boolSelect("supportsLongCacheRetention", "controls.compat.supportsLongCacheRetention"));
			else gridContent = e$13("div", { className: "dsh-ma-grid" }, e$13(Field, { labelKey: "controls.compat.thinkingFormat" }, e$13(Select, {
				value: compat.thinkingFormat,
				choices: [...THINKING_FORMATS],
				choiceKeyPrefix: "controls.thinkingFormat",
				disabled: props.disabled,
				unsetKey: "controls.select.auto",
				onChange: (value) => set("thinkingFormat", value)
			})), boolSelect("supportsReasoningEffort", "controls.compat.supportsReasoningEffort"), boolSelect("supportsDeveloperRole", "controls.compat.supportsDeveloperRole"), e$13(Field, { labelKey: "controls.compat.maxTokensField" }, e$13(Select, {
				value: compat.maxTokensField,
				choices: [...MAX_TOKENS_FIELDS],
				choiceKeyPrefix: "controls.maxTokensField",
				disabled: props.disabled,
				unsetKey: "controls.select.auto",
				onChange: (value) => set("maxTokensField", value)
			})), boolSelect("supportsUsageInStreaming", "controls.compat.supportsUsageInStreaming"), boolSelect("supportsFinishReason", "controls.compat.supportsFinishReason"), boolSelect("supportsStore", "controls.compat.supportsStore"), boolSelect("supportsStrictMode", "controls.compat.supportsStrictMode"), boolSelect("supportsLongCacheRetention", "controls.compat.supportsLongCacheRetention"), e$13(Field, { labelKey: "controls.compat.cacheControlFormat" }, e$13(Select, {
				value: compat.cacheControlFormat,
				choices: [...CACHE_CONTROL_FORMATS],
				choiceKeyPrefix: "controls.cacheControlFormat",
				disabled: props.disabled,
				unsetKey: "controls.select.auto",
				onChange: (value) => set("cacheControlFormat", value)
			})), boolSelect("requiresToolResultName", "controls.compat.requiresToolResultName"), boolSelect("requiresAssistantAfterToolResult", "controls.compat.requiresAssistantAfterToolResult"), boolSelect("requiresThinkingAsText", "controls.compat.requiresThinkingAsText"), boolSelect("requiresReasoningContentOnAssistantMessages", "controls.compat.requiresReasoningContentOnAssistantMessages"), boolSelect("supportsThinkingTokenBudget", "controls.compat.supportsThinkingTokenBudget"));
			return e$13("div", { className: "dsh-ma-card" }, e$13("div", {
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
			}, e$13("div", { className: "dsh-ma-card-title" }, e$13("span", null, tr(props.titleKey || "controls.compat.title")), configuredCount > 0 ? e$13("span", { className: "dsh-ma-tag" }, tr("controls.compat.configuredCount", { count: configuredCount })) : null), e$13("button", {
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
			}, tr(open ? "action.collapse" : "action.expand"))), open ? e$13("div", { className: "dsh-ma-card-body" }, gridContent) : null);
		}
		//#endregion
		//#region src/client/controls/reasoning-efforts-editor.ts
		const e$12 = react.createElement;
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
			}, e$12("div", { className: "dsh-ma-card-title" }, e$12("span", null, tr(props.titleKey || "models.field.reasoningEfforts")), e$12("span", { className: "dsh-ma-tag" }, badgeText)), e$12("button", {
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
			}, tr(open ? "action.collapse" : "action.expand"))), open ? e$12("div", {
				className: "dsh-ma-card-body",
				style: {
					display: "flex",
					flexDirection: "column",
					gap: "10px"
				}
			}, e$12(Select, {
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
			}), isCustom ? e$12(KeyValueList, {
				kind: "efforts",
				value: props.value,
				disabled: props.disabled,
				onChange: (nextValue) => props.onChange(nextValue)
			}) : null) : null);
		}
		//#endregion
		//#region src/client/controls/retry-policy.ts
		const e$11 = react.createElement;
		function RetryPolicy(props) {
			const policy = isObject(props.value) ? props.value : {
				mode: "normal",
				maxRetries: 2,
				retryableCodes: [...DEFAULT_RETRYABLE_CODES],
				backoff: {
					initialDelayMs: 500,
					maxDelayMs: 1e4,
					jitterRatio: .1
				}
			};
			const backoff = isObject(policy.backoff) ? policy.backoff : {};
			const set = (field, value) => props.onChange?.({
				...policy,
				[field]: value
			});
			const setBackoff = (field, value) => props.onChange?.({
				...policy,
				backoff: {
					...backoff,
					[field]: value
				}
			});
			return e$11("div", { className: "dsh-ma-grid dsh-ma-wide" }, e$11(Field, { labelKey: "controls.retry.modeLabel" }, e$11(Select, {
				value: policy.mode === "always" ? "always" : "normal",
				allowUnset: false,
				disabled: props.disabled,
				choices: [{
					value: "normal",
					labelKey: "controls.retry.mode.normal"
				}, {
					value: "always",
					labelKey: "controls.retry.mode.always"
				}],
				onChange: (mode) => props.onChange?.(mode === "always" ? {
					mode: "always",
					backoff
				} : {
					mode: "normal",
					maxRetries: policy.maxRetries === void 0 ? 2 : policy.maxRetries,
					retryableCodes: policy.retryableCodes || [...DEFAULT_RETRYABLE_CODES],
					backoff
				})
			})), policy.mode !== "always" ? e$11(Field, { labelKey: "controls.retry.maxRetries" }, e$11(TextInput, {
				type: "number",
				min: 0,
				step: 1,
				value: policy.maxRetries,
				disabled: props.disabled,
				onChange: (value) => set("maxRetries", value)
			})) : null, policy.mode !== "always" ? e$11(Field, {
				labelKey: "controls.retry.retryableCodes",
				wide: true
			}, e$11(TextInput, {
				value: Array.isArray(policy.retryableCodes) ? policy.retryableCodes.join(", ") : "",
				disabled: props.disabled,
				emptyAsUndefined: false,
				onChange: (value) => set("retryableCodes", String(value).split(/[,\s]+/).map((item) => item.trim()).filter(Boolean))
			})) : null, e$11(Field, { labelKey: "controls.retry.initialDelayMs" }, e$11(TextInput, {
				type: "number",
				min: 1,
				max: MAX_TIMER_DELAY_MS,
				value: backoff.initialDelayMs,
				disabled: props.disabled,
				onChange: (value) => setBackoff("initialDelayMs", value)
			})), e$11(Field, { labelKey: "controls.retry.maxDelayMs" }, e$11(TextInput, {
				type: "number",
				min: 1,
				max: MAX_TIMER_DELAY_MS,
				value: backoff.maxDelayMs,
				disabled: props.disabled,
				onChange: (value) => setBackoff("maxDelayMs", value)
			})), e$11(Field, { labelKey: "controls.retry.jitterRatio" }, e$11(TextInput, {
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
		const e$10 = react.createElement;
		function CredentialField({ api, keyRef, revision, value, onChange, disabled }) {
			const [state, setState] = react.useState();
			react.useEffect(() => {
				let active = true;
				api.credentials.describe({ refs: [keyRef] }).then((response) => {
					if (active && response.result.ok) setState(response.result.value.credentials[keyRef]);
				}, () => void 0);
				return () => {
					active = false;
				};
			}, [
				api,
				keyRef,
				revision
			]);
			return e$10("label", { className: "dsh-ma-field" }, e$10("span", { className: "dsh-ma-field-label" }, tr("credential.label", { status: tr(state?.configured === true ? "credential.configured" : "credential.notConfigured") })), e$10(TextInput, {
				type: "password",
				value,
				disabled,
				placeholderKey: "placeholder.keepKey",
				onChange
			}));
		}
		//#endregion
		//#region src/client/models/discovery-dialog.ts
		const e$9 = react.createElement;
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
			const footer = e$9("div", { className: "dsh-ma-actions" }, e$9("button", {
				type: "button",
				className: "dsh-ma-button",
				onClick: onClose
			}, tr("models.discovery.cancel")), e$9("button", {
				type: "button",
				className: "dsh-ma-button dsh-ma-primary",
				disabled: selected.length === 0,
				onClick: () => onApply(selected)
			}, tr(selected.length > 0 ? "models.discovery.confirm" : "models.discovery.pickRequired", { count: selected.length })));
			return e$9(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				onClose,
				title: tr("models.discovery.title"),
				closeLabel: tr("models.discovery.close"),
				description: tr("models.discovery.description"),
				footer
			}, status === "loading" ? e$9("p", { className: "dsh-ma-status" }, tr("models.discovery.loading")) : null, status === "error" ? e$9("p", {
				className: "dsh-ma-status dsh-ma-error",
				role: "alert"
			}, failure) : null, status === "ready" ? e$9("div", { className: "dsh-ma-group" }, e$9("input", {
				className: "dsh-ma-input",
				type: "search",
				value: query,
				placeholder: tr("models.discovery.searchPlaceholder"),
				"aria-label": tr("models.discovery.searchLabel"),
				onChange: (event) => setQuery(event.target.value)
			}), e$9("label", { className: "dsh-ma-check" }, e$9("input", {
				type: "checkbox",
				checked: allSelected,
				disabled: selectable.length === 0,
				onChange: toggleAll
			}), tr("models.discovery.selectFiltered")), e$9("div", { className: "dsh-ma-models" }, filtered.map((candidate) => {
				const exists = existing.has(candidate.id ?? "");
				return e$9("label", {
					key: candidate.id,
					className: "dsh-ma-check",
					style: exists ? { opacity: .45 } : void 0
				}, e$9("input", {
					type: "checkbox",
					checked: picked.has(candidate.id ?? ""),
					disabled: exists,
					onChange: () => setPicked((current) => {
						const next = new Set(current);
						if (!next.delete(candidate.id ?? "")) next.add(candidate.id ?? "");
						return next;
					})
				}), e$9("span", null, candidate.name ? `${candidate.name} (${candidate.id})` : candidate.id), typeof candidate.contextWindow === "number" || typeof candidate.maxTokens === "number" ? e$9("span", { className: "dsh-ma-route" }, [typeof candidate.contextWindow === "number" ? tr("models.discovery.contextWindow", { value: formatCapacity(candidate.contextWindow) }) : null, typeof candidate.maxTokens === "number" ? tr("models.discovery.maxTokens", { value: formatCapacity(candidate.maxTokens) }) : null].filter(Boolean).join(" · ")) : null, exists ? e$9("span", { className: "dsh-ma-route" }, tr("models.discovery.existing")) : null);
			}))) : null);
		}
		//#endregion
		//#region src/client/models/model-form.ts
		const e$8 = react.createElement;
		function setField$1(source, field, value) {
			const next = clone({ ...source || {} });
			if (value === void 0) delete next[field];
			else next[field] = clone(value);
			return next;
		}
		function ModelForm({ model, onChange, disabled, includeId, api }) {
			const set = (field, value) => onChange(setField$1(model, field, value));
			return e$8("div", { className: "dsh-ma-grid" }, includeId ? e$8("label", { className: "dsh-ma-field" }, e$8("span", { className: "dsh-ma-field-label" }, tr("models.field.id")), e$8(TextInput, {
				value: model.id,
				disabled,
				onChange: (value) => set("id", value)
			})) : null, e$8("label", { className: "dsh-ma-field" }, e$8("span", { className: "dsh-ma-field-label" }, tr("models.field.name")), e$8(TextInput, {
				value: model.name,
				disabled,
				onChange: (value) => set("name", value)
			})), e$8("label", { className: "dsh-ma-field" }, e$8("span", { className: "dsh-ma-field-label" }, tr("models.field.contextWindow")), e$8(CapacityInput, {
				value: model.contextWindow,
				disabled,
				placeholderKey: "placeholder.contextWindow",
				ariaLabelKey: "models.field.contextWindow",
				onChange: (value) => set("contextWindow", value)
			})), e$8("label", { className: "dsh-ma-field" }, e$8("span", { className: "dsh-ma-field-label" }, tr("models.field.maxTokens")), e$8(CapacityInput, {
				value: model.maxTokens,
				disabled,
				placeholderKey: "placeholder.maxTokens",
				ariaLabelKey: "models.field.maxTokens",
				onChange: (value) => set("maxTokens", value)
			})), e$8("div", { className: "dsh-ma-field" }, e$8("span", { className: "dsh-ma-field-label" }, tr("models.field.input")), e$8(Modalities, {
				value: model.input,
				disabled,
				onChange: (value) => set("input", value.length === 0 ? void 0 : value)
			})), e$8("div", { className: "dsh-ma-wide" }, e$8(ReasoningEffortsEditor, {
				value: model.reasoningEfforts,
				disabled,
				titleKey: "models.field.reasoningEfforts",
				onChange: (value) => set("reasoningEfforts", value)
			})), e$8("div", { className: "dsh-ma-wide" }, e$8(CompatEditor, {
				value: model.compat,
				disabled,
				api,
				titleKey: "models.field.compat",
				onChange: (value) => set("compat", value)
			})));
		}
		//#endregion
		//#region src/client/models/model-list.ts
		const e$7 = react.createElement;
		function ModelList({ value, onChange, disabled, override, probe, api }) {
			const [discovering, setDiscovering] = react.useState(false);
			const list = Array.isArray(value) ? value : [];
			const entries = override ? Object.entries(isObject(value) ? value : {}) : list.map((item, index) => [String(index), item]);
			const update = (key, model) => override ? onChange({
				...value || {},
				[key]: model
			}) : onChange(list.map((item, index) => String(index) === key ? model : item));
			return e$7("div", { className: "dsh-ma-wide" }, entries.map(([key, model], index) => e$7("div", {
				className: "dsh-ma-model",
				key: `${key}-${index}`
			}, e$7("div", { className: "dsh-ma-model-head" }, override ? e$7("input", {
				className: "dsh-ma-input",
				style: { maxWidth: "320px" },
				value: key,
				disabled,
				placeholder: tr("models.override.idPlaceholder"),
				onChange: (event) => {
					const next = {};
					for (const [id, item] of Object.entries(value || {})) next[id === key ? event.target.value : id] = item;
					onChange(next);
				}
			}) : e$7("span", { className: "dsh-ma-model-title" }, model.id || tr("models.item.fallback", { index: index + 1 })), e$7("div", { className: "dsh-ma-toolbar" }, e$7("button", {
				type: "button",
				className: "dsh-ma-button dsh-ma-icon",
				disabled,
				title: tr("models.action.clone"),
				"aria-label": tr("models.action.clone"),
				onClick: () => {
					if (override) {
						const next = {};
						for (const [id, item] of Object.entries(value || {})) {
							next[id] = item;
							if (id === key) {
								let copyId = `${key}-copy`;
								let counter = 2;
								while (Object.prototype.hasOwnProperty.call(value || {}, copyId) || Object.prototype.hasOwnProperty.call(next, copyId)) {
									copyId = `${key}-copy-${counter}`;
									counter += 1;
								}
								next[copyId] = clone(item);
							}
						}
						onChange(next);
					} else {
						const cloned = clone(model);
						if (cloned.id) {
							const existingIds = new Set(list.map((m) => m.id).filter((id) => Boolean(id)));
							let copyId = `${cloned.id}-copy`;
							let counter = 2;
							while (existingIds.has(copyId)) {
								copyId = `${cloned.id}-copy-${counter}`;
								counter += 1;
							}
							cloned.id = copyId;
						}
						onChange([
							...list.slice(0, index + 1),
							cloned,
							...list.slice(index + 1)
						]);
					}
				}
			}, e$7(_deepseek_ai_dsh_client_ui_primitives.IconCopyOutline16, { size: 16 })), e$7("button", {
				type: "button",
				className: "dsh-ma-button dsh-ma-icon",
				disabled,
				title: tr("models.action.remove"),
				"aria-label": tr("models.action.remove"),
				onClick: () => {
					if (override) {
						const next = { ...value || {} };
						delete next[key];
						onChange(next);
					} else onChange(list.filter((_, itemIndex) => itemIndex !== index));
				}
			}, e$7(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, { size: 16 })))), e$7(ModelForm, {
				model,
				includeId: !override,
				disabled,
				api,
				onChange: (next) => update(key, next)
			}))), e$7("div", {
				className: "dsh-ma-toolbar",
				style: { marginTop: "8px" }
			}, e$7("button", {
				type: "button",
				className: "dsh-ma-button",
				disabled,
				onClick: () => {
					if (!override) return onChange([...list, { id: "" }]);
					let index = 1;
					let id = `model-${index}`;
					while (Object.prototype.hasOwnProperty.call(value || {}, id)) {
						index += 1;
						id = `model-${index}`;
					}
					onChange({
						...value || {},
						[id]: {}
					});
				}
			}, e$7(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, { size: 14 }), tr(override ? "models.action.addOverride" : "models.action.add")), !override && probe ? e$7("button", {
				type: "button",
				className: "dsh-ma-button",
				disabled: disabled || !probe.provider && !probe.baseURL,
				onClick: () => setDiscovering(true)
			}, tr("models.discovery.open")) : null), discovering && probe ? e$7(ModelDiscoveryDialog, {
				probe,
				existing: new Set(list.map((model) => model.id).filter((id) => Boolean(id))),
				onClose: () => setDiscovering(false),
				onApply: (models) => {
					const known = new Set(list.map((model) => model.id).filter((id) => Boolean(id)));
					const additions = [];
					for (const model of models) {
						if (!model.id || known.has(model.id)) continue;
						known.add(model.id);
						additions.push({
							id: model.id,
							...model.name ? { name: model.name } : {},
							...typeof model.contextWindow === "number" ? { contextWindow: model.contextWindow } : {},
							...typeof model.maxTokens === "number" ? { maxTokens: model.maxTokens } : {}
						});
					}
					onChange([...list, ...additions]);
					setDiscovering(false);
				}
			}) : null);
		}
		//#endregion
		//#region src/client/models/official-models.ts
		const e$6 = react.createElement;
		function setField(source, field, value) {
			const next = clone({ ...source || {} });
			delete next.imageDetail;
			if (value === void 0) delete next[field];
			else next[field] = clone(value);
			return next;
		}
		function OfficialModelList({ value, onChange, disabled }) {
			const models = Array.isArray(value) ? value : [];
			const update = (index, field, value) => onChange(models.map((model, modelIndex) => modelIndex === index ? setField(model, field, value === "" ? void 0 : value) : model));
			return e$6("div", { className: "dsh-ma-wide" }, models.map((model, index) => {
				const modalities = model.inputModalities ?? model.input ?? ["text"];
				const hasImage = modalities.includes("image");
				return e$6("div", {
					className: "dsh-ma-model",
					key: `${model.id || "model"}-${index}`
				}, e$6("div", { className: "dsh-ma-model-head" }, e$6("span", { className: "dsh-ma-model-title" }, model.id || tr("models.item.fallback", { index: index + 1 })), e$6("div", { className: "dsh-ma-toolbar" }, e$6("button", {
					type: "button",
					className: "dsh-ma-button dsh-ma-icon",
					disabled,
					title: tr("models.action.clone"),
					"aria-label": tr("models.action.clone"),
					onClick: () => {
						const cloned = clone(model);
						if (cloned.id) {
							const existingIds = new Set(models.map((m) => m.id).filter((id) => Boolean(id)));
							let copyId = `${cloned.id}-copy`;
							let counter = 2;
							while (existingIds.has(copyId)) {
								copyId = `${cloned.id}-copy-${counter}`;
								counter += 1;
							}
							cloned.id = copyId;
						}
						onChange([
							...models.slice(0, index + 1),
							cloned,
							...models.slice(index + 1)
						]);
					}
				}, e$6(_deepseek_ai_dsh_client_ui_primitives.IconCopyOutline16, { size: 16 })), e$6("button", {
					type: "button",
					className: "dsh-ma-button dsh-ma-icon",
					disabled,
					title: tr("models.action.remove"),
					"aria-label": tr("models.action.remove"),
					onClick: () => onChange(models.filter((_, modelIndex) => modelIndex !== index))
				}, e$6(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, { size: 16 })))), e$6("div", { className: "dsh-ma-grid" }, e$6("label", { className: "dsh-ma-field" }, e$6("span", { className: "dsh-ma-field-label" }, tr("models.field.id")), e$6(TextInput, {
					value: model.id,
					disabled,
					onChange: (nextValue) => update(index, "id", nextValue)
				})), e$6("label", { className: "dsh-ma-field" }, e$6("span", { className: "dsh-ma-field-label" }, tr("models.field.name")), e$6(TextInput, {
					value: model.name,
					disabled,
					onChange: (nextValue) => update(index, "name", nextValue)
				})), e$6("label", { className: "dsh-ma-field dsh-ma-wide" }, e$6("span", { className: "dsh-ma-field-label" }, tr("models.field.description")), e$6(TextInput, {
					value: model.description,
					disabled,
					onChange: (nextValue) => update(index, "description", nextValue)
				})), e$6("label", { className: "dsh-ma-field" }, e$6("span", { className: "dsh-ma-field-label" }, tr("models.field.contextWindow")), e$6(CapacityInput, {
					value: model.contextWindow,
					disabled,
					placeholder: "256K",
					ariaLabelKey: "models.field.contextWindow",
					onChange: (nextValue) => update(index, "contextWindow", nextValue)
				})), e$6("label", { className: "dsh-ma-field" }, e$6("span", { className: "dsh-ma-field-label" }, tr("models.field.maxTokens")), e$6(CapacityInput, {
					value: model.maxTokens,
					disabled,
					placeholder: "32K",
					ariaLabelKey: "models.field.maxTokens",
					onChange: (nextValue) => update(index, "maxTokens", nextValue)
				})), e$6("div", { className: "dsh-ma-field dsh-ma-wide" }, e$6("span", { className: "dsh-ma-field-label" }, tr("models.field.inputModalities")), e$6(Modalities, {
					value: modalities,
					disabled,
					onChange: (nextValue) => {
						const nextModalities = nextValue.length === 0 ? ["text"] : nextValue;
						const nextHasImage = nextModalities.includes("image");
						const nextModel = {
							...model,
							inputModalities: nextModalities
						};
						if (!nextHasImage) {
							delete nextModel.imagePixelBudget;
							delete nextModel.imageMaxBytes;
						}
						delete nextModel.imageDetail;
						delete nextModel.input;
						onChange(models.map((item, itemIndex) => itemIndex === index ? nextModel : item));
					}
				})), hasImage ? e$6("label", { className: "dsh-ma-field" }, e$6("span", { className: "dsh-ma-field-label" }, tr("models.field.imagePixelBudget")), e$6(CapacityInput, {
					value: model.imagePixelBudget,
					allowLow: true,
					disabled,
					placeholderKey: "placeholder.imagePixelBudget",
					ariaLabelKey: "models.field.imagePixelBudget",
					onChange: (nextValue) => update(index, "imagePixelBudget", nextValue)
				})) : null, hasImage ? e$6("label", { className: "dsh-ma-field" }, e$6("span", { className: "dsh-ma-field-label" }, tr("models.field.imageMaxBytes")), e$6(CapacityInput, {
					value: model.imageMaxBytes,
					disabled,
					placeholderKey: "placeholder.imageMaxBytes",
					ariaLabelKey: "models.field.imageMaxBytes",
					onChange: (nextValue) => update(index, "imageMaxBytes", nextValue)
				})) : null));
			}), e$6("button", {
				type: "button",
				className: "dsh-ma-button",
				disabled,
				onClick: () => onChange([...models, { id: "" }])
			}, e$6(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, { size: 14 }), tr("models.action.add")));
		}
		//#endregion
		//#region src/client/validation.ts
		function numberError(value, key, errors, min, max, integer) {
			if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max || integer && !Number.isInteger(value)) errors.push(tr("validation.number", { field: tr(key) }));
		}
		function validateCompat(value, path, errors) {
			if (!isObject(value)) {
				errors.push(tr("validation.object", { field: path }));
				return;
			}
			if (owns(value, "thinkingFormat") && !THINKING_FORMATS.includes(String(value.thinkingFormat))) errors.push(tr("validation.invalid", { field: `${path}.thinkingFormat` }));
			if (owns(value, "maxTokensField") && !MAX_TOKENS_FIELDS.includes(String(value.maxTokensField))) errors.push(tr("validation.invalid", { field: `${path}.maxTokensField` }));
			if (owns(value, "cacheControlFormat") && !CACHE_CONTROL_FORMATS.includes(String(value.cacheControlFormat))) errors.push(tr("validation.invalid", { field: `${path}.cacheControlFormat` }));
			for (const field of [
				"supportsReasoningEffort",
				"supportsDeveloperRole",
				"supportsStore",
				"supportsUsageInStreaming",
				"supportsFinishReason",
				"requiresToolResultName",
				"requiresAssistantAfterToolResult",
				"requiresThinkingAsText",
				"requiresReasoningContentOnAssistantMessages",
				"supportsThinkingTokenBudget",
				"supportsStrictMode",
				"supportsLongCacheRetention",
				"supportsEagerToolInputStreaming",
				"supportsCacheControlOnTools",
				"supportsTemperature",
				"forceAdaptiveThinking",
				"allowEmptySignature",
				"supportsStrictTools"
			]) if (owns(value, field) && typeof value[field] !== "boolean") errors.push(tr("validation.invalid", { field: `${path}.${field}` }));
			for (const dictField of ["chatTemplateKwargs", "chatTemplateArgs"]) if (owns(value, dictField) && !isObject(value[dictField])) errors.push(tr("validation.object", { field: `${path}.${dictField}` }));
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
		function validateModel(model, path, requireId = true) {
			const errors = [];
			if (!isObject(model)) return [tr("validation.object", { field: path })];
			if (requireId && (typeof model.id !== "string" || model.id.trim().length === 0)) errors.push(tr("validation.modelId", { index: path }));
			for (const field of ["contextWindow", "maxTokens"]) if (owns(model, field)) numberError(model[field], `field.${field}`, errors, 1, Number.MAX_SAFE_INTEGER, true);
			if (owns(model, "input") && (!Array.isArray(model.input) || model.input.some((item) => !MODALITIES.includes(item)))) errors.push(tr("validation.modalities"));
			if (owns(model, "reasoningEfforts")) validateReasoningEfforts(model.reasoningEfforts, `${path}.reasoningEfforts`, errors);
			if (owns(model, "compat")) validateCompat(model.compat, `${path}.compat`, errors);
			return errors;
		}
		function validateRetryPolicy(value) {
			const errors = [];
			if (!isObject(value) || !["normal", "always"].includes(String(value.mode)) || !isObject(value.backoff)) return [tr("validation.retry")];
			numberError(value.backoff.initialDelayMs, "field.initialDelayMs", errors, Number.MIN_VALUE, MAX_TIMER_DELAY_MS, false);
			numberError(value.backoff.maxDelayMs, "field.maxDelayMs", errors, Number.MIN_VALUE, MAX_TIMER_DELAY_MS, false);
			numberError(value.backoff.jitterRatio, "field.jitterRatio", errors, 0, 1, false);
			if (Number(value.backoff.initialDelayMs) > Number(value.backoff.maxDelayMs)) errors.push(tr("validation.backoffOrder"));
			if (value.mode === "normal") {
				numberError(value.maxRetries, "field.maxRetries", errors, 0, Number.MAX_SAFE_INTEGER, true);
				if (!Array.isArray(value.retryableCodes) || value.retryableCodes.length === 0 || value.retryableCodes.some((code) => typeof code !== "string" || code.trim().length === 0) || new Set(value.retryableCodes).size !== value.retryableCodes.length) errors.push(tr("validation.retryCodes"));
			}
			return errors;
		}
		function validateProfile(profile) {
			const errors = [];
			if (!isObject(profile)) return [tr("validation.object", { field: tr("provider.label") })];
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
			if (owns(profile, "compat")) validateCompat(profile.compat, tr("field.compat"), errors);
			if (owns(profile, "retryPolicy")) errors.push(...validateRetryPolicy(profile.retryPolicy));
			if (owns(profile, "models")) {
				if (!Array.isArray(profile.models)) errors.push(tr("validation.models"));
				else {
					const ids = /* @__PURE__ */ new Set();
					profile.models.forEach((entry, index) => {
						errors.push(...validateModel(entry, tr("modelIndex", { index: index + 1 })));
						if (isObject(entry) && typeof entry.id === "string") {
							if (ids.has(entry.id)) errors.push(tr("validation.duplicateModel", { id: entry.id }));
							ids.add(entry.id);
						}
					});
				}
			}
			if (owns(profile, "modelOverrides")) {
				if (!isObject(profile.modelOverrides)) errors.push(tr("validation.overrides"));
				else for (const [id, entry] of Object.entries(profile.modelOverrides)) errors.push(...validateModel(entry, tr("overrideId", { id }), false));
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
							for (const field of ["contextWindow", "maxTokens"]) if (owns(entry, field)) numberError(entry[field], `field.${field}`, errors, 1, Number.MAX_SAFE_INTEGER, true);
							const modalities = owns(entry, "inputModalities") ? entry.inputModalities : owns(entry, "input") ? entry.input : void 0;
							if (modalities !== void 0) {
								if (!Array.isArray(modalities) || modalities.length === 0 || modalities.some((item) => !MODALITIES.includes(item)) || new Set(modalities).size !== modalities.length) errors.push(tr("validation.modalities"));
							}
							if (!(Array.isArray(modalities) && modalities.includes("image"))) {
								if (owns(entry, "imagePixelBudget") || owns(entry, "imageMaxBytes") || owns(entry, "imageDetail")) errors.push(tr("validation.textOnlyImageLimits"));
							} else {
								if (owns(entry, "imagePixelBudget")) {
									const budget = entry.imagePixelBudget;
									if (budget !== "low") numberError(budget, "field.imagePixelBudget", errors, 1, Number.MAX_SAFE_INTEGER, true);
								}
								if (owns(entry, "imageMaxBytes")) numberError(entry.imageMaxBytes, "field.imageMaxBytes", errors, 1, Number.MAX_SAFE_INTEGER, true);
								if (owns(entry, "imageDetail")) errors.push(tr("validation.invalid", { field: `${path}.imageDetail` }));
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
		function OfficialProviderEditor({ namespace, api, writable, reload }) {
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
			const ops = OFFICIAL_FIELDS.flatMap((field) => {
				const value = draft[field];
				if (equal(value, baseline[field])) return [];
				return value === void 0 ? [{
					op: "unset",
					path: [field]
				}] : [{
					op: "set",
					path: [field],
					value: clone(value)
				}];
			});
			if (keyDraft.trim() && !draft.apiKeyEnv) ops.push({
				op: "set",
				path: ["apiKeyEnv"],
				value: keyRef
			});
			const save = async () => {
				const errors = validateOfficialProfile({
					...draft,
					...keyDraft.trim() && !draft.apiKeyEnv ? { apiKeyEnv: keyRef } : {}
				});
				if (errors.length) {
					setFailure(errors[0]);
					return;
				}
				setBusy(true);
				try {
					if (ops.length) valueOf(await api.settings.mutate({
						ns: OFFICIAL_NS,
						ops,
						expectedRevision: namespace.revision
					}));
					if (keyDraft.trim()) valueOf(await api.credentials.set({
						ref: keyRef,
						value: keyDraft.trim()
					}));
					setKeyDraft("");
					await reload();
				} catch (error) {
					setFailure(responseMessage(error));
				} finally {
					setBusy(false);
				}
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
			})))), e$5("div", { className: "dsh-ma-group" }, e$5("h3", { className: "dsh-ma-group-title" }, tr("group.models")), e$5(OfficialModelList, {
				value: draft.models,
				disabled: readOnly,
				onChange: (value) => setField("models", value)
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
		//#region src/client/state.ts
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
		function buildProfileOps(path, initial, draft, explicit) {
			return PROFILE_FIELDS.flatMap((field) => {
				if (initial.explicit[field] && !explicit[field]) return [{
					op: "unset",
					path: [...path, field]
				}];
				if (explicit[field] && (!initial.explicit[field] || !equal(initial.profile[field], draft[field]))) return [{
					op: "set",
					path: [...path, field],
					value: clone(draft[field])
				}];
				return [];
			});
		}
		function filterCompatByProtocol(compat, api) {
			if (!isObject(compat) || api === void 0) return compat;
			const allowed = PROTOCOL_COMPAT_FIELDS[api];
			if (!allowed) return void 0;
			const filtered = {};
			for (const [key, value] of Object.entries(compat)) if (allowed.includes(key) && value !== void 0 && value !== null && value !== "") {
				if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) continue;
				filtered[key] = value;
			}
			return Object.keys(filtered).length === 0 ? void 0 : filtered;
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
			if (api === "openai-completions" || api === void 0) return profile;
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
		//#region src/client/providers/provider-editor.ts
		const e$4 = react.createElement;
		function translatedChoices(values, prefix) {
			return values.map((value) => ({
				value,
				labelKey: `${prefix}.${value}`
			}));
		}
		function ProviderEditor({ row, namespace, writable, reload, timeout }) {
			const initial = initialEditorState(namespace, row.settingsPath);
			const [open, setOpen] = react.useState(false);
			const [draft, setDraft] = react.useState(initial.profile);
			const [explicit, setExplicit] = react.useState(initial.explicit);
			const [baseline, setBaseline] = react.useState(initial);
			const [failure, setFailure] = react.useState("");
			const [busy, setBusy] = react.useState(false);
			const [confirmDelete, setConfirmDelete] = react.useState(false);
			const [deleteCountdown, setDeleteCountdown] = react.useState(0);
			const [keyDraft, setKeyDraft] = react.useState("");
			react.useEffect(() => {
				const next = initialEditorState(namespace, row.settingsPath);
				setDraft(next.profile);
				setExplicit(next.explicit);
				setBaseline(next);
				setFailure("");
			}, [namespace.revision, row.provider]);
			react.useEffect(() => {
				if (!confirmDelete || deleteCountdown <= 0) return void 0;
				return timeout(() => setDeleteCountdown((value) => value - 1), 1e3);
			}, [
				confirmDelete,
				deleteCountdown,
				timeout
			]);
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
			const cleaned = stripModelCompat(draft, draft.api);
			const ops = buildProfileOps(row.settingsPath, baseline, cleaned, explicit);
			if (keyValue && !explicit.apiKeyEnv) ops.push({
				op: "set",
				path: [...row.settingsPath, "apiKeyEnv"],
				value: keyRef
			});
			const save = async () => {
				const errors = validateProfile(Object.fromEntries(PROFILE_FIELDS.filter((name) => name === "api" && (row.declared || explicit.api || draft.api) || explicit[name] || name === "apiKeyEnv" && keyValue).map((name) => [name, name === "apiKeyEnv" && !explicit.apiKeyEnv ? keyRef : cleaned[name]])));
				if (errors.length) {
					setFailure(errors[0]);
					return;
				}
				setBusy(true);
				setFailure("");
				try {
					if (ops.length) valueOf(await row.api.settings.mutate({
						ns: SETTINGS_NS,
						ops,
						expectedRevision: namespace.revision
					}));
					if (keyValue) valueOf(await row.api.credentials.set({
						ref: keyRef,
						value: keyValue
					}));
					setKeyDraft("");
					await reload();
				} catch (error) {
					setFailure(responseMessage(error));
				} finally {
					setBusy(false);
				}
			};
			const remove = async () => {
				if (deleteCountdown > 0) return;
				setBusy(true);
				setFailure("");
				try {
					if (typeof draft.apiKeyEnv === "string" && draft.apiKeyEnv) valueOf(await row.api.credentials.unset({ ref: draft.apiKeyEnv }));
					valueOf(await row.api.settings.mutate({
						ns: SETTINGS_NS,
						ops: [{
							op: "unset",
							path: [...row.settingsPath]
						}],
						expectedRevision: namespace.revision
					}));
					await reload();
				} catch (error) {
					setFailure(responseMessage(error));
				} finally {
					setBusy(false);
				}
			};
			const customFields = e$4(react.Fragment, null, e$4("div", { className: "dsh-ma-group" }, e$4("h3", { className: "dsh-ma-group-title" }, tr("group.connection")), e$4("div", { className: "dsh-ma-grid" }, field("displayName", e$4(TextInput, {
				value: draft.displayName,
				disabled: !explicit.displayName || readOnly,
				onChange: (value) => setField("displayName", value)
			})), field("apiKeyEnv", e$4(TextInput, {
				value: draft.apiKeyEnv,
				disabled: !explicit.apiKeyEnv || readOnly,
				placeholderKey: "placeholder.credentialRef",
				onChange: (value) => setField("apiKeyEnv", value)
			})), e$4(CredentialField, {
				api: row.api,
				keyRef,
				revision: namespace.revision,
				value: keyDraft,
				disabled: readOnly,
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
				placeholderKey: "placeholder.baseURL",
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
				disabled: !explicit.models || readOnly,
				api: draft.api,
				probe: {
					clientApi: row.api,
					provider: row.provider,
					baseURL: draft.baseURL,
					api: draft.api,
					apiKey: keyValue || void 0
				},
				onChange: (value) => setField("models", value)
			}), true)));
			const builtInFields = e$4("div", { className: "dsh-ma-group" }, e$4("h3", { className: "dsh-ma-group-title" }, tr("group.overrides")), explicit.models && explicit.modelOverrides ? e$4("div", { className: "dsh-ma-notice" }, tr("validation.catalogConflict")) : null, field("modelOverrides", e$4(ModelList, {
				override: true,
				value: draft.modelOverrides,
				disabled: !explicit.modelOverrides || explicit.models || readOnly,
				api: draft.api,
				onChange: (value) => setField("modelOverrides", value)
			}), true));
			return e$4("section", { className: "dsh-ma-provider" }, e$4("div", { className: "dsh-ma-provider-head" }, e$4("div", { className: "dsh-ma-identity" }, e$4("span", { className: "dsh-ma-name" }, row.displayName), e$4("span", { className: "dsh-ma-route" }, row.provider), e$4("span", { className: "dsh-ma-tag" }, tr(row.declared ? "provider.custom" : "provider.builtIn"))), row.userAdded ? e$4("button", {
				type: "button",
				className: "dsh-ma-button",
				disabled: readOnly,
				onClick: () => {
					setConfirmDelete(true);
					setDeleteCountdown(3);
				}
			}, tr("action.delete")) : null, e$4("button", {
				type: "button",
				className: "dsh-ma-button",
				"aria-expanded": open,
				onClick: () => setOpen((value) => !value)
			}, tr(open ? "action.collapse" : "action.edit"))), confirmDelete ? e$4("div", {
				className: "dsh-ma-delete-confirm",
				role: "alert"
			}, e$4("p", null, tr(draft.apiKeyEnv ? "delete.withCredential" : "delete.providerOnly", { ref: draft.apiKeyEnv || "" })), e$4("div", { className: "dsh-ma-actions" }, e$4("button", {
				type: "button",
				className: "dsh-ma-button",
				disabled: busy,
				onClick: () => {
					setConfirmDelete(false);
					setDeleteCountdown(0);
				}
			}, tr("action.cancel")), e$4("button", {
				type: "button",
				className: "dsh-ma-button dsh-ma-primary",
				disabled: readOnly || deleteCountdown > 0,
				onClick: remove
			}, deleteCountdown > 0 ? tr("delete.wait", { seconds: deleteCountdown }) : tr("action.confirmDelete")))) : null, open ? e$4("div", { className: "dsh-ma-form" }, customFields, row.declared ? null : builtInFields, failure ? e$4("p", {
				className: "dsh-ma-status dsh-ma-error",
				role: "alert"
			}, failure) : null, e$4("div", { className: "dsh-ma-actions" }, e$4("button", {
				type: "button",
				className: "dsh-ma-button",
				disabled: readOnly || !ops.length,
				onClick: () => {
					setDraft(clone(baseline.profile));
					setExplicit({ ...baseline.explicit });
					setFailure("");
				}
			}, tr("action.undo")), e$4("button", {
				type: "button",
				className: "dsh-ma-button dsh-ma-primary",
				disabled: readOnly || !ops.length,
				onClick: save
			}, tr(busy ? "action.saving" : "action.apply")))) : null);
		}
		//#endregion
		//#region src/client/providers/custom-provider.ts
		const e$3 = react.createElement;
		function CreateCustomProvider({ namespace, rows, api, writable, reload, close }) {
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
				try {
					valueOf(await api.settings.mutate({
						ns: SETTINGS_NS,
						expectedRevision: namespace.revision,
						ops: [{
							op: "set",
							path: ["providers", route],
							value: profile
						}]
					}));
					await reload();
					close();
				} catch (error) {
					setFailure(responseMessage(error));
				} finally {
					setBusy(false);
				}
			};
			const disabled = !writable || busy;
			return e$3("section", { className: "dsh-ma-create" }, e$3("h3", { className: "dsh-ma-group-title" }, tr("custom.title")), e$3("div", { className: "dsh-ma-grid" }, e$3(Field, { labelKey: "field.routeId" }, e$3(TextInput, {
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
		function AddBuiltInProvider({ namespace, rows, api, writable, reload, close }) {
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
				try {
					valueOf(await api.settings.mutate({
						ns: SETTINGS_NS,
						expectedRevision: namespace.revision,
						ops: [{
							op: "set",
							path: [...selected.settingsPath],
							value: {}
						}]
					}));
					await reload();
					close();
				} catch (error) {
					setFailure(responseMessage(error));
				} finally {
					setBusy(false);
				}
			};
			return e$2("section", { className: "dsh-ma-create" }, e$2("h3", { className: "dsh-ma-group-title" }, tr("builtin.title")), e$2(Field, { labelKey: "field.builtInProvider" }, e$2("select", {
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
		function AdvancedModelsPage({ api, retryLater, timeout, subscribe }) {
			const [state, setState] = react.useState({
				status: "idle",
				writable: false,
				rows: [],
				catalogRows: [],
				namespace: void 0,
				officialNamespace: void 0,
				error: ""
			});
			const [createMode, setCreateMode] = react.useState(void 0);
			const load = async () => {
				setState((current) => current.status === "waiting" ? {
					...current,
					error: ""
				} : {
					...current,
					status: "loading",
					error: ""
				});
				try {
					const [providerResponse, settingsResponse] = await Promise.all([api.llm.providers({}), api.settings.describe({})]);
					const providerList = valueOf(providerResponse).providers;
					const settings = valueOf(settingsResponse);
					const namespace = settings.namespaces.find((entry) => entry.ns === SETTINGS_NS);
					const officialNamespace = settings.namespaces.find((entry) => entry.ns === OFFICIAL_NS);
					if (!namespace || !officialNamespace) {
						setState((current) => ({
							...current,
							status: "waiting",
							error: ""
						}));
						return false;
					}
					const catalogRows = providerList.filter((entry) => entry.settingsNs === SETTINGS_NS).map((entry) => ({
						...entry,
						api,
						userAdded: hasUserProfile(namespace, entry.settingsPath)
					}));
					setState({
						status: "ready",
						writable: settings.writable === true,
						rows: catalogRows.filter((entry) => entry.userAdded),
						catalogRows,
						namespace,
						officialNamespace,
						error: ""
					});
					return true;
				} catch (error) {
					setState((current) => ({
						...current,
						status: "error",
						error: responseMessage(error)
					}));
					return true;
				}
			};
			react.useEffect(() => {
				let active = true;
				let cancelRetry;
				const attempt = async () => {
					if (!await load() && active) cancelRetry = retryLater(attempt, 250);
				};
				attempt();
				const dispose = subscribe(() => {
					if (active) load();
				});
				return () => {
					active = false;
					if (cancelRetry) cancelRetry();
					dispose();
				};
			}, []);
			const editorProps = (row) => ({
				key: row.provider,
				row: {
					...row,
					userAdded: true
				},
				namespace: state.namespace,
				writable: state.writable,
				reload: load,
				timeout
			});
			return e$1("div", { className: "dsh-ma-page" }, e$1("div", { className: "dsh-ma-header" }, e$1("h2", { className: "dsh-ma-title" }, tr("title")), e$1("div", { className: "dsh-ma-toolbar" }, e$1("button", {
				type: "button",
				className: "dsh-ma-button",
				disabled: state.status === "loading",
				title: tr("refresh"),
				"aria-label": tr("refresh"),
				onClick: load
			}, e$1(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline16, { size: 16 })), e$1("button", {
				type: "button",
				className: "dsh-ma-button",
				disabled: !state.writable || state.status !== "ready",
				onClick: () => setCreateMode((value) => value === "builtin" ? void 0 : "builtin")
			}, e$1(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, { size: 14 }), tr("addBuiltIn")), e$1("button", {
				type: "button",
				className: "dsh-ma-button",
				disabled: !state.writable || state.status !== "ready",
				onClick: () => setCreateMode((value) => value === "custom" ? void 0 : "custom")
			}, e$1(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, { size: 14 }), tr("addCustom")))), !state.writable && state.status === "ready" ? e$1("div", { className: "dsh-ma-notice" }, tr("readOnly")) : null, state.status === "loading" ? e$1("p", { className: "dsh-ma-status" }, tr("loading")) : null, state.status === "waiting" ? e$1("p", { className: "dsh-ma-status" }, tr("waiting")) : null, state.status === "error" ? e$1("p", {
				className: "dsh-ma-status dsh-ma-error",
				role: "alert"
			}, state.error) : null, createMode === "builtin" && state.namespace ? e$1(AddBuiltInProvider, {
				namespace: state.namespace,
				rows: state.catalogRows,
				api,
				writable: state.writable,
				reload: load,
				close: () => setCreateMode(void 0)
			}) : null, createMode === "custom" && state.namespace ? e$1(CreateCustomProvider, {
				namespace: state.namespace,
				rows: state.catalogRows,
				api,
				writable: state.writable,
				reload: load,
				close: () => setCreateMode(void 0)
			}) : null, e$1("div", { className: "dsh-ma-list" }, e$1("h3", { className: "dsh-ma-section-title" }, tr("builtInProviders")), state.officialNamespace ? e$1(OfficialProviderEditor, {
				namespace: state.officialNamespace,
				api,
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
			"remote.settings",
			"timer"
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
			const PEN_PATH = "M9.94076 1.34942C10.7047 0.90231 11.6503 0.902415 12.4143 1.34942C12.7061 1.52015 12.9688 1.79118 13.3104 2.13284C13.6521 2.47448 13.9231 2.73721 14.0939 3.02894C14.5408 3.79294 14.5409 4.73856 14.0939 5.50251C13.9231 5.79415 13.652 6.05704 13.3104 6.39861L6.65932 13.0497C6.28068 13.4284 6.00695 13.7108 5.66543 13.9097C5.32391 14.1085 4.94315 14.2074 4.42705 14.3498L3.24394 14.6761C2.77527 14.8054 2.34538 14.9262 2.00131 14.9684C1.65196 15.0112 1.17964 15.0013 0.810764 14.6325C0.441921 14.2637 0.432107 13.7913 0.47486 13.442C0.517035 13.0979 0.6379 12.668 0.767181 12.1993L1.09352 11.0162C1.23588 10.5001 1.33481 10.1193 1.5336 9.77784C1.7325 9.43632 2.0149 9.1626 2.39355 8.78395L9.04466 2.13284C9.38625 1.79126 9.64911 1.52016 9.94076 1.34942ZM15.5427 14.8398H7.55223L8.96707 13.425H15.5427V14.8398ZM3.39382 9.78422C2.965 10.213 2.84244 10.3436 2.75709 10.49C2.67183 10.6366 2.61862 10.8079 2.45733 11.3925L2.13099 12.5756C2.00183 13.0439 1.92194 13.3419 1.88863 13.5536C2.10041 13.5204 2.39872 13.4416 2.86764 13.3123L4.05075 12.9859C4.63544 12.8246 4.80669 12.7715 4.95323 12.6862C5.09968 12.6008 5.23022 12.4783 5.65905 12.0494L10.721 6.98644L8.45577 4.72121L3.39382 9.78422ZM11.7 2.57079C11.3774 2.38198 10.9777 2.38198 10.6551 2.57079C10.5602 2.62647 10.4487 2.72931 10.0449 3.13311L9.45604 3.72094L11.7213 5.98617L12.3102 5.39833C12.7139 4.99457 12.8168 4.88307 12.8725 4.78818C13.0613 4.46561 13.0612 4.06585 12.8725 3.74326C12.8169 3.64827 12.7146 3.53752 12.3102 3.13311C11.9057 2.72863 11.795 2.6264 11.7 2.57079Z";
			const makePenSvg = () => {
				const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
				svg.setAttribute("viewBox", "0 0 16 16");
				svg.setAttribute("fill", "none");
				const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
				path.setAttribute("d", PEN_PATH);
				path.setAttribute("fill", "currentColor");
				svg.appendChild(path);
				return svg;
			};
			const swapNavIcon = () => {
				const label = tr("nav");
				for (const button of document.querySelectorAll("button")) {
					const span = button.querySelector("span");
					if (!span || span.textContent !== label) continue;
					const icon = button.querySelector("svg");
					if (!icon || icon.dataset.dshMaIcon === "pen") continue;
					const pen = makePenSvg();
					for (const name of [
						"width",
						"height",
						"class"
					]) {
						const value = icon.getAttribute(name);
						if (value !== null) pen.setAttribute(name, value);
					}
					pen.dataset.dshMaIcon = "pen";
					icon.replaceWith(pen);
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
			const subscribe = (refresh) => {
				const disposers = [
					ctx.remote.$on("settings/document-updated", (namespace) => {
						if (namespace === "llm-pi-ai" || namespace === "llm-deepseek") refresh();
					}),
					ctx.remote.$on("credentials/reference-updated", refresh),
					ctx.remote.$on("llm/adapters-updated", refresh),
					ctx.on("connection/reset", refresh)
				];
				return () => {
					for (const dispose of disposers) dispose();
				};
			};
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "model-advanced",
				order: 11,
				label: () => tr("nav")
			}, function Page() {
				return e(LocalePage, {
					locale: ctx.locale,
					api: createModelApi(ctx),
					retryLater: ctx.timer.timeout.bind(ctx.timer),
					timeout: ctx.timer.timeout.bind(ctx.timer),
					subscribe
				});
			}));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map