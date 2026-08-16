import * as React from "react";
import * as core from "./core.ts";
import * as controls from "./controls.ts";
import * as models from "./models.ts";
import type {
	ModelApi,
	ProviderRow,
	SettingsNamespaceView,
} from "./core.ts";

export interface CredentialFieldProps {
	api: ModelApi;
	keyRef: string;
	revision: number;
	value: string;
	onChange: (value: string | number | undefined) => void;
	disabled?: boolean;
}

export interface ProviderEditorProps {
	row: ProviderRow;
	namespace: SettingsNamespaceView;
	writable: boolean;
	reload: () => unknown;
	timeout: (callback: () => void, delay: number) => () => void;
}

export interface CreateCustomProviderProps {
	namespace: SettingsNamespaceView;
	rows: ProviderRow[];
	api: ModelApi;
	writable: boolean;
	reload: () => unknown;
	close: () => void;
}

export interface AddBuiltInProviderProps {
	namespace: SettingsNamespaceView;
	rows: ProviderRow[];
	api: ModelApi;
	writable: boolean;
	reload: () => unknown;
	close: () => void;
}

export interface OfficialProviderEditorProps {
	namespace: SettingsNamespaceView;
	api: ModelApi;
	writable: boolean;
	reload: () => unknown;
}

const e = React.createElement;
const tr = core.tr;
const {
	Field,
	TextInput,
	ProtocolSelect,
	Select,
	Modalities,
	KeyValueList,
	CompatEditor,
	RetryPolicy,
} = controls;
const { ModelList, OfficialModelList } = models;

function translatedChoices(values: readonly string[], prefix: string) {
	return values.map((value) => ({ value, labelKey: `${prefix}.${value}` }));
}

function CredentialField({
	api,
	keyRef,
	revision,
	value,
	onChange,
	disabled,
}: CredentialFieldProps) {
	const [state, setState] = React.useState<{ configured?: boolean }>();
	React.useEffect(() => {
		let active = true;
		api.credentials.describe({ refs: [keyRef] }).then(
			(response) => {
				if (active && response.result.ok)
					setState(
						(
							response.result.value as {
								credentials: Record<
									string,
									{ configured?: boolean }
								>;
							}
						).credentials[keyRef],
					);
			},
			() => undefined,
		);
		return () => {
			active = false;
		};
	}, [api, keyRef, revision]);
	return e(
		"label",
		{ className: "dsh-ma-field" },
		e(
			"span",
			{ className: "dsh-ma-field-label" },
			tr("credential.label", {
				status: tr(
					state?.configured === true
						? "credential.configured"
						: "credential.notConfigured",
				),
			}),
		),
		e(TextInput, {
			type: "password",
			value,
			disabled,
			placeholderKey: "placeholder.keepKey",
			onChange,
		}),
	);
}

export function ProviderEditor({
	row,
	namespace,
	writable,
	reload,
	timeout,
}: ProviderEditorProps) {
	const initial = core.initialEditorState(namespace, row.settingsPath);
	const [open, setOpen] = React.useState(false);
	const [draft, setDraft] = React.useState(initial.profile);
	const [explicit, setExplicit] = React.useState(initial.explicit);
	const [baseline, setBaseline] = React.useState(initial);
	const [failure, setFailure] = React.useState("");
	const [busy, setBusy] = React.useState(false);
	const [confirmDelete, setConfirmDelete] = React.useState(false);
	const [deleteCountdown, setDeleteCountdown] = React.useState(0);
	const [keyDraft, setKeyDraft] = React.useState("");

	React.useEffect(() => {
		const next = core.initialEditorState(namespace, row.settingsPath);
		setDraft(next.profile);
		setExplicit(next.explicit);
		setBaseline(next);
		setFailure("");
	}, [namespace.revision, row.provider]);

	React.useEffect(() => {
		if (!confirmDelete || deleteCountdown <= 0) return undefined;
		return timeout(() => setDeleteCountdown((value) => value - 1), 1000);
	}, [confirmDelete, deleteCountdown, timeout]);

	const readOnly = !writable || busy;
	const keyRef =
		typeof draft.apiKeyEnv === "string" && draft.apiKeyEnv
			? draft.apiKeyEnv
			: core.deriveKeyRef(row.provider);
	const keyValue = keyDraft.trim();
	const setField = (field: string, value: unknown) => {
		setDraft((current) => core.setIn(current, field, value));
		setExplicit((current) => ({ ...current, [field]: true }));
	};
	const field = (name: string, child: React.ReactNode, wide?: boolean) =>
		e(
			Field,
			{
				key: name,
				labelKey: `field.${name}`,
				enabled: explicit[name] === true,
				readOnly,
				wide,
				onEnabled: (enabled) =>
					setExplicit((current) => ({ ...current, [name]: enabled })),
			},
			child,
		);
	// Model compatibility only applies to openai-completions; when the route
	// speaks another protocol, drop every model's compat at save time so
	// entries typed under the old protocol do not persist. The cleaned draft
	// is what the ops (and their dirty check) are computed against.
	const cleaned = core.stripModelCompat(draft, draft.api);
	const ops = core.buildProfileOps(
		row.settingsPath,
		baseline,
		cleaned,
		explicit,
	);
	if (keyValue && !explicit.apiKeyEnv) {
		ops.push({
			op: "set",
			path: [...row.settingsPath, "apiKeyEnv"],
			value: keyRef,
		});
	}

	const save = async () => {
		const profile = Object.fromEntries(
			core.PROFILE_FIELDS.filter(
				(name) => explicit[name] || (name === "apiKeyEnv" && keyValue),
			).map((name) => [
				name,
				name === "apiKeyEnv" && !explicit.apiKeyEnv
					? keyRef
					: cleaned[name],
			]),
		);
		const errors = core.validateProfile(profile);
		if (errors.length) {
			setFailure(errors[0]);
			return;
		}
		setBusy(true);
		setFailure("");
		try {
			if (ops.length)
				core.valueOf(
					await row.api.settings.mutate({
						ns: core.SETTINGS_NS,
						ops,
						expectedRevision: namespace.revision,
					}),
				);
			if (keyValue)
				core.valueOf(
					await row.api.credentials.set({
						ref: keyRef,
						value: keyValue,
					}),
				);
			setKeyDraft("");
			await reload();
		} catch (error) {
			setFailure(core.responseMessage(error));
		} finally {
			setBusy(false);
		}
	};

	const remove = async () => {
		if (deleteCountdown > 0) return;
		setBusy(true);
		setFailure("");
		try {
			if (typeof draft.apiKeyEnv === "string" && draft.apiKeyEnv) {
				core.valueOf(
					await row.api.credentials.unset({ ref: draft.apiKeyEnv }),
				);
			}
			core.valueOf(
				await row.api.settings.mutate({
					ns: core.SETTINGS_NS,
					ops: [{ op: "unset", path: [...row.settingsPath] }],
					expectedRevision: namespace.revision,
				}),
			);
			await reload();
		} catch (error) {
			setFailure(core.responseMessage(error));
		} finally {
			setBusy(false);
		}
	};

	const customFields = e(
		React.Fragment,
		null,
		e(
			"div",
			{ className: "dsh-ma-group" },
			e(
				"h3",
				{ className: "dsh-ma-group-title" },
				tr("group.connection"),
			),
			e(
				"div",
				{ className: "dsh-ma-grid" },
				field(
					"displayName",
					e(TextInput, {
						value: draft.displayName,
						disabled: !explicit.displayName || readOnly,
						onChange: (value) => setField("displayName", value),
					}),
				),
				field(
					"apiKeyEnv",
					e(TextInput, {
						value: draft.apiKeyEnv,
						disabled: !explicit.apiKeyEnv || readOnly,
						placeholderKey: "placeholder.credentialRef",
						onChange: (value) => setField("apiKeyEnv", value),
					}),
				),
				e(CredentialField, {
					api: row.api,
					keyRef,
					revision: namespace.revision,
					value: keyDraft,
					disabled: readOnly,
					onChange: (value) => setKeyDraft(String(value || "")),
				}),
				field(
					"api",
					e(ProtocolSelect, {
						value: draft.api,
						disabled: !explicit.api || readOnly,
						onChange: (value) => setField("api", value),
					}),
				),
				field(
					"baseURL",
					e(TextInput, {
						value: draft.baseURL,
						disabled: !explicit.baseURL || readOnly,
						placeholderKey: "placeholder.baseURL",
						onChange: (value) => setField("baseURL", value),
					}),
					true,
				),
			),
		),
		e(
			"div",
			{ className: "dsh-ma-group" },
			e("h3", { className: "dsh-ma-group-title" }, tr("group.capacity")),
			e(
				"div",
				{ className: "dsh-ma-grid dsh-ma-grid-3" },
				field(
					"defaultContextWindow",
					e(TextInput, {
						type: "number",
						min: 1,
						step: 1,
						value: draft.defaultContextWindow,
						disabled: !explicit.defaultContextWindow || readOnly,
						onChange: (value) =>
							setField("defaultContextWindow", value),
					}),
				),
				field(
					"defaultMaxTokens",
					e(TextInput, {
						type: "number",
						min: 1,
						step: 1,
						value: draft.defaultMaxTokens,
						disabled: !explicit.defaultMaxTokens || readOnly,
						onChange: (value) =>
							setField("defaultMaxTokens", value),
					}),
				),
				field(
					"defaultInput",
					e(Modalities, {
						value: draft.defaultInput,
						disabled: !explicit.defaultInput || readOnly,
						onChange: (value) => setField("defaultInput", value),
					}),
				),
			),
		),
		e(
			"div",
			{ className: "dsh-ma-group" },
			e("h3", { className: "dsh-ma-group-title" }, tr("group.reasoning")),
			e(
				"div",
				{ className: "dsh-ma-grid" },
				field(
					"reasoning",
					e(Select, {
						value: draft.reasoning,
						choices: translatedChoices(
							core.THINKING_LEVELS,
							"option.thinking",
						),
						disabled: !explicit.reasoning || readOnly,
						onChange: (value) => setField("reasoning", value),
					}),
				),
				field(
					"cacheRetention",
					e(Select, {
						value: draft.cacheRetention,
						choices: translatedChoices(
							core.CACHE_RETENTIONS,
							"option.cache",
						),
						disabled: !explicit.cacheRetention || readOnly,
						onChange: (value) => setField("cacheRetention", value),
					}),
				),
				field(
					"thinkingBudgets",
					e(
						"div",
						{ className: "dsh-ma-subgrid" },
						core.BUDGET_LEVELS.map((level) =>
							e(
								"label",
								{ className: "dsh-ma-field", key: level },
								e(
									"span",
									{ className: "dsh-ma-field-label" },
									tr(`option.thinking.${level}`),
								),
								e(TextInput, {
									type: "number",
									min: 0,
									step: 1,
									value: core.isObject(draft.thinkingBudgets)
										? draft.thinkingBudgets[level]
										: undefined,
									disabled:
										!explicit.thinkingBudgets || readOnly,
									onChange: (value) => {
										const next = {
											...(core.isObject(
												draft.thinkingBudgets,
											)
												? draft.thinkingBudgets
												: {}),
										};
										if (value === undefined)
											delete next[level];
										else next[level] = value as number;
										setField("thinkingBudgets", next);
									},
								}),
							),
						),
					),
					true,
				),
				field(
					"compat",
					e(CompatEditor, {
						value: draft.compat,
						disabled: !explicit.compat || readOnly,
						onChange: (value) => setField("compat", value),
					}),
					true,
				),
			),
		),
		e(
			"div",
			{ className: "dsh-ma-group" },
			e("h3", { className: "dsh-ma-group-title" }, tr("group.transport")),
			e(
				"div",
				{ className: "dsh-ma-grid dsh-ma-grid-3" },
				field(
					"transport",
					e(Select, {
						value: draft.transport,
						choices: translatedChoices(
							core.TRANSPORTS,
							"option.transport",
						),
						disabled: !explicit.transport || readOnly,
						onChange: (value) => setField("transport", value),
					}),
				),
				...[
					"timeoutMs",
					"websocketConnectTimeoutMs",
					"streamIdleTimeoutMs",
				].map((name) =>
					field(
						name,
						e(TextInput, {
							type: "number",
							min: name === "streamIdleTimeoutMs" ? 1 : 0,
							value: draft[name] as string | number | undefined,
							disabled: !explicit[name] || readOnly,
							onChange: (value) => setField(name, value),
						}),
					),
				),
			),
		),
		e(
			"div",
			{ className: "dsh-ma-group" },
			field(
				"headers",
				e(KeyValueList, {
					kind: "headers",
					value: draft.headers,
					disabled: !explicit.headers || readOnly,
					onChange: (value) => setField("headers", value),
				}),
				true,
			),
		),
		e(
			"div",
			{ className: "dsh-ma-group" },
			field(
				"retryPolicy",
				e(RetryPolicy, {
					value: draft.retryPolicy,
					disabled: !explicit.retryPolicy || readOnly,
					onChange: (value) => setField("retryPolicy", value),
				}),
				true,
			),
		),
		e(
			"div",
			{ className: "dsh-ma-group" },
			field(
				"models",
				e(ModelList, {
					value: draft.models,
					disabled: !explicit.models || readOnly,
					api: draft.api,
					probe: {
						clientApi: row.api,
						provider: row.provider,
						baseURL: draft.baseURL,
						api: draft.api,
						apiKey: keyValue || undefined,
					},
					onChange: (value) => setField("models", value),
				}),
				true,
			),
		),
	);

	const builtInFields = e(
		"div",
		{ className: "dsh-ma-group" },
		e("h3", { className: "dsh-ma-group-title" }, tr("group.overrides")),
		explicit.models && explicit.modelOverrides
			? e(
					"div",
					{ className: "dsh-ma-notice" },
					tr("validation.catalogConflict"),
				)
			: null,
		field(
			"modelOverrides",
			e(ModelList, {
				override: true,
				value: draft.modelOverrides,
				disabled:
					!explicit.modelOverrides || explicit.models || readOnly,
				api: draft.api,
				onChange: (value) => setField("modelOverrides", value),
			}),
			true,
		),
	);

	return e(
		"section",
		{ className: "dsh-ma-provider" },
		e(
			"div",
			{ className: "dsh-ma-provider-head" },
			e(
				"div",
				{ className: "dsh-ma-identity" },
				e("span", { className: "dsh-ma-name" }, row.displayName),
				e("span", { className: "dsh-ma-route" }, row.provider),
				e(
					"span",
					{ className: "dsh-ma-tag" },
					tr(row.declared ? "provider.custom" : "provider.builtIn"),
				),
			),
			row.userAdded
				? e(
						"button",
						{
							type: "button",
							className: "dsh-ma-button",
							disabled: readOnly,
							onClick: () => {
								setConfirmDelete(true);
								setDeleteCountdown(3);
							},
						},
						tr("action.delete"),
					)
				: null,
			e(
				"button",
				{
					type: "button",
					className: "dsh-ma-button",
					"aria-expanded": open,
					onClick: () => setOpen((value) => !value),
				},
				tr(open ? "action.collapse" : "action.edit"),
			),
		),
		confirmDelete
			? e(
					"div",
					{ className: "dsh-ma-delete-confirm", role: "alert" },
					e(
						"p",
						null,
						tr(
							draft.apiKeyEnv
								? "delete.withCredential"
								: "delete.providerOnly",
							{ ref: draft.apiKeyEnv || "" },
						),
					),
					e(
						"div",
						{ className: "dsh-ma-actions" },
						e(
							"button",
							{
								type: "button",
								className: "dsh-ma-button",
								disabled: busy,
								onClick: () => {
									setConfirmDelete(false);
									setDeleteCountdown(0);
								},
							},
							tr("action.cancel"),
						),
						e(
							"button",
							{
								type: "button",
								className: "dsh-ma-button dsh-ma-primary",
								disabled: readOnly || deleteCountdown > 0,
								onClick: remove,
							},
							deleteCountdown > 0
								? tr("delete.wait", {
										seconds: deleteCountdown,
									})
								: tr("action.confirmDelete"),
						),
					),
				)
			: null,
		open
			? e(
					"div",
					{ className: "dsh-ma-form" },
					customFields,
					row.declared ? null : builtInFields,
					failure
						? e(
								"p",
								{
									className: "dsh-ma-status dsh-ma-error",
									role: "alert",
								},
								failure,
							)
						: null,
					e(
						"div",
						{ className: "dsh-ma-actions" },
						e(
							"button",
							{
								type: "button",
								className: "dsh-ma-button",
								disabled: readOnly || !ops.length,
								onClick: () => {
									setDraft(core.clone(baseline.profile));
									setExplicit({ ...baseline.explicit });
									setFailure("");
								},
							},
							tr("action.undo"),
						),
						e(
							"button",
							{
								type: "button",
								className: "dsh-ma-button dsh-ma-primary",
								disabled: readOnly || !ops.length,
								onClick: save,
							},
							tr(busy ? "action.saving" : "action.apply"),
						),
					),
				)
			: null,
	);
}

export function CreateCustomProvider({
	namespace,
	rows,
	api,
	writable,
	reload,
	close,
}: CreateCustomProviderProps) {
	const [route, setRoute] = React.useState("");
	const [displayName, setDisplayName] = React.useState("");
	const [protocol, setProtocol] = React.useState("openai-completions");
	const [baseURL, setBaseURL] = React.useState("");
	const [catalog, setCatalog] = React.useState<core.ModelProfile[]>([
		{ id: "" },
	]);
	const [failure, setFailure] = React.useState("");
	const [busy, setBusy] = React.useState(false);
	const submit = async () => {
		const profile: core.ProviderProfile = core.stripModelCompat(
			{
				api: protocol as core.Protocol,
				baseURL,
				models: catalog,
			},
			protocol,
		);
		if (displayName.trim()) profile.displayName = displayName.trim();
		const errors = [
			...(/^[a-z][a-z0-9-]*$/.test(route)
				? []
				: [tr("validation.route")]),
			...(rows.some((row) => row.provider === route)
				? [tr("validation.duplicateProvider")]
				: []),
			...core.validateProfile(profile),
		];
		if (errors.length) {
			setFailure(errors[0]);
			return;
		}
		setBusy(true);
		try {
			core.valueOf(
				await api.settings.mutate({
					ns: core.SETTINGS_NS,
					expectedRevision: namespace.revision,
					ops: [
						{
							op: "set",
							path: ["providers", route],
							value: profile,
						},
					],
				}),
			);
			await reload();
			close();
		} catch (error) {
			setFailure(core.responseMessage(error));
		} finally {
			setBusy(false);
		}
	};
	const disabled = !writable || busy;
	return e(
		"section",
		{ className: "dsh-ma-create" },
		e("h3", { className: "dsh-ma-group-title" }, tr("custom.title")),
		e(
			"div",
			{ className: "dsh-ma-grid" },
			e(
				Field,
				{ labelKey: "field.routeId" },
				e(TextInput, {
					value: route,
					disabled,
					placeholderKey: "placeholder.providerId",
					onChange: (value) => setRoute(String(value || "")),
				}),
			),
			e(
				Field,
				{ labelKey: "field.displayName" },
				e(TextInput, {
					value: displayName,
					disabled,
					placeholderKey: "placeholder.displayName",
					onChange: (value) => setDisplayName(String(value || "")),
				}),
			),
			e(
				Field,
				{ labelKey: "field.api" },
				e(ProtocolSelect, {
					value: protocol,
					disabled,
					onChange: setProtocol as (value: string | undefined) => void,
				}),
			),
			e(
				Field,
				{ labelKey: "field.baseURL", wide: true },
				e(TextInput, {
					value: baseURL,
					disabled,
					placeholderKey: "placeholder.baseURL",
					onChange: (value) => setBaseURL(String(value || "")),
				}),
			),
		),
		e(
			Field,
			{ labelKey: "field.models", wide: true },
			e(ModelList, {
				value: catalog,
				disabled,
				api: protocol,
				onChange: (value) =>
					setCatalog(Array.isArray(value) ? value : []),
			}),
		),

		failure
			? e(
					"p",
					{ className: "dsh-ma-status dsh-ma-error", role: "alert" },
					failure,
				)
			: null,
		e(
			"div",
			{ className: "dsh-ma-actions" },
			e(
				"button",
				{
					type: "button",
					className: "dsh-ma-button",
					disabled: busy,
					onClick: close,
				},
				tr("action.cancel"),
			),
			e(
				"button",
				{
					type: "button",
					className: "dsh-ma-button dsh-ma-primary",
					disabled,
					onClick: submit,
				},
				tr(busy ? "action.creating" : "action.createProvider"),
			),
		),
	);
}

export function AddBuiltInProvider({
	namespace,
	rows,
	api,
	writable,
	reload,
	close,
}: AddBuiltInProviderProps) {
	const available = rows.filter(
		(row) => row.declared !== true && !row.userAdded,
	);
	const [provider, setProvider] = React.useState(
		available[0]?.provider || "",
	);
	const [failure, setFailure] = React.useState("");
	const [busy, setBusy] = React.useState(false);
	const selected = available.find((row) => row.provider === provider);
	const submit = async () => {
		if (!selected) {
			setFailure(tr("validation.noBuiltIn"));
			return;
		}
		setBusy(true);
		try {
			core.valueOf(
				await api.settings.mutate({
					ns: core.SETTINGS_NS,
					expectedRevision: namespace.revision,
					ops: [
						{
							op: "set",
							path: [...selected.settingsPath],
							value: {},
						},
					],
				}),
			);
			await reload();
			close();
		} catch (error) {
			setFailure(core.responseMessage(error));
		} finally {
			setBusy(false);
		}
	};
	return e(
		"section",
		{ className: "dsh-ma-create" },
		e("h3", { className: "dsh-ma-group-title" }, tr("builtin.title")),
		e(
			Field,
			{ labelKey: "field.builtInProvider" },
			e(
				"select",
				{
					className: "dsh-ma-select",
					value: provider,
					disabled: !writable || busy || !available.length,
					onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
						setProvider(event.target.value),
				},
				available.map((row) =>
					e(
						"option",
						{ key: row.provider, value: row.provider },
						row.displayName,
					),
				),
			),
		),

		failure
			? e(
					"p",
					{ className: "dsh-ma-status dsh-ma-error", role: "alert" },
					failure,
				)
			: null,
		e(
			"div",
			{ className: "dsh-ma-actions" },
			e(
				"button",
				{
					type: "button",
					className: "dsh-ma-button",
					disabled: busy,
					onClick: close,
				},
				tr("action.cancel"),
			),
			e(
				"button",
				{
					type: "button",
					className: "dsh-ma-button dsh-ma-primary",
					disabled: !writable || busy || !selected,
					onClick: submit,
				},
				tr(busy ? "action.adding" : "action.addProvider"),
			),
		),
	);
}

export function OfficialProviderEditor({
	namespace,
	api,
	writable,
	reload,
}: OfficialProviderEditorProps) {
	const initial = core.clone(namespace?.value || {}) as core.OfficialProfile;
	const [draft, setDraft] = React.useState(initial);
	const [baseline, setBaseline] = React.useState(initial);
	const [keyDraft, setKeyDraft] = React.useState("");
	const [busy, setBusy] = React.useState(false);
	const [failure, setFailure] = React.useState("");
	const [open, setOpen] = React.useState(false);
	React.useEffect(() => {
		const next = core.clone(namespace?.value || {}) as core.OfficialProfile;
		setDraft(next);
		setBaseline(next);
		setFailure("");
	}, [namespace.revision]);
	const keyRef = draft.apiKeyEnv || core.deriveKeyRef("deepseek");
	const setField = (field: string, value: unknown) =>
		setDraft((current) => core.setIn(current, field, value));
	const ops = core.OFFICIAL_FIELDS.flatMap(
		(field): core.SettingsPathOp[] => {
			const value = draft[field];
			if (core.equal(value, baseline[field])) return [];
			return value === undefined
				? [{ op: "unset", path: [field] }]
				: [{ op: "set", path: [field], value: core.clone(value) }];
		},
	);
	if (keyDraft.trim() && !draft.apiKeyEnv)
		ops.push({ op: "set", path: ["apiKeyEnv"], value: keyRef });
	const save = async () => {
		const errors = core.validateOfficialProfile({
			...draft,
			...(keyDraft.trim() && !draft.apiKeyEnv
				? { apiKeyEnv: keyRef }
				: {}),
		});
		if (errors.length) {
			setFailure(errors[0]);
			return;
		}
		setBusy(true);
		try {
			if (ops.length)
				core.valueOf(
					await api.settings.mutate({
						ns: core.OFFICIAL_NS,
						ops,
						expectedRevision: namespace.revision,
					}),
				);
			if (keyDraft.trim())
				core.valueOf(
					await api.credentials.set({
						ref: keyRef,
						value: keyDraft.trim(),
					}),
				);
			setKeyDraft("");
			await reload();
		} catch (error) {
			setFailure(core.responseMessage(error));
		} finally {
			setBusy(false);
		}
	};
	const readOnly = !writable || busy;
	return e(
		"section",
		{ className: "dsh-ma-provider", "data-settings-ns": core.OFFICIAL_NS },
		e(
			"div",
			{ className: "dsh-ma-provider-head" },
			e(
				"div",
				{ className: "dsh-ma-identity" },
				e("span", { className: "dsh-ma-name" }, tr("official.title")),
				e("span", { className: "dsh-ma-route" }, core.OFFICIAL_NS),
				e("span", { className: "dsh-ma-tag" }, tr("official.fixed")),
			),
			e(
				"button",
				{
					type: "button",
					className: "dsh-ma-button",
					"aria-expanded": open,
					onClick: () => setOpen((value) => !value),
				},
				tr(open ? "action.collapse" : "action.expand"),
			),
		),
		open
			? e(
					"div",
					{ className: "dsh-ma-form" },
					e(
						"div",
						{ className: "dsh-ma-group" },
						e(
							"h3",
							{ className: "dsh-ma-group-title" },
							tr("group.connection"),
						),
						e(
							"div",
							{ className: "dsh-ma-grid" },
							e(CredentialField, {
								api,
								keyRef,
								revision: namespace.revision,
								value: keyDraft,
								disabled: readOnly,
								onChange: (value) =>
									setKeyDraft(String(value || "")),
							}),
							e(
								Field,
								{ labelKey: "field.apiKeyEnv" },
								e(TextInput, {
									value: draft.apiKeyEnv,
									disabled: readOnly,
									onChange: (value) =>
										setField("apiKeyEnv", value),
								}),
							),
							e(
								Field,
								{ labelKey: "field.baseURL", wide: true },
								e(TextInput, {
									value: draft.baseURL,
									disabled: readOnly,
									placeholderKey:
										"placeholder.officialBaseURL",
									onChange: (value) =>
										setField("baseURL", value),
								}),
							),
						),
					),
					e(
						"div",
						{ className: "dsh-ma-group" },
						e(
							"h3",
							{ className: "dsh-ma-group-title" },
							tr("group.officialReasoning"),
						),
						e(
							"div",
							{ className: "dsh-ma-grid" },
							e(
								Field,
								{ labelKey: "field.thinking" },
								e(Select, {
									value: draft.thinking,
									choices: translatedChoices(
										core.OFFICIAL_THINKING,
										"option.thinking",
									),
									disabled: readOnly,
									onChange: (value) =>
										setField("thinking", value),
								}),
							),
							e(
								Field,
								{ labelKey: "field.reasoningEffort" },
								e(Select, {
									value: draft.reasoningEffort,
									choices: translatedChoices(
										core.OFFICIAL_REASONING,
										"option.thinking",
									),
									disabled: readOnly,
									onChange: (value) =>
										setField("reasoningEffort", value),
								}),
							),
							e(
								Field,
								{ labelKey: "field.defaultContextWindow" },
								e(TextInput, {
									type: "number",
									min: 1,
									value: draft.defaultContextWindow,
									disabled: readOnly,
									onChange: (value) =>
										setField("defaultContextWindow", value),
								}),
							),
							e(
								Field,
								{ labelKey: "field.maxTokens" },
								e(TextInput, {
									type: "number",
									min: 1,
									value: draft.maxTokens,
									disabled: readOnly,
									onChange: (value) =>
										setField("maxTokens", value),
								}),
							),
						),
					),
					e(
						"div",
						{ className: "dsh-ma-group" },
						e(
							"h3",
							{ className: "dsh-ma-group-title" },
							tr("group.models"),
						),
						e(OfficialModelList, {
							value: draft.models,
							disabled: readOnly,
							onChange: (value) => setField("models", value),
						}),
					),
					e(
						"div",
						{ className: "dsh-ma-group" },
						e(
							"h3",
							{ className: "dsh-ma-group-title" },
							tr("group.flowRetry"),
						),
						e(
							"div",
							{ className: "dsh-ma-grid" },
							e(
								Field,
								{ labelKey: "field.streamIdleTimeoutMs" },
								e(TextInput, {
									type: "number",
									min: 1,
									max: core.MAX_TIMER_DELAY_MS,
									value: draft.streamIdleTimeoutMs,
									disabled: readOnly,
									onChange: (value) =>
										setField("streamIdleTimeoutMs", value),
								}),
							),
							e(
								Field,
								{ labelKey: "field.retryPolicy", wide: true },
								e(RetryPolicy, {
									value: draft.retryPolicy,
									disabled: readOnly,
									onChange: (value) =>
										setField("retryPolicy", value),
								}),
							),
						),
					),

					failure
						? e(
								"p",
								{
									className: "dsh-ma-status dsh-ma-error",
									role: "alert",
								},
								failure,
							)
						: null,
					e(
						"div",
						{ className: "dsh-ma-actions" },
						e(
							"button",
							{
								type: "button",
								className: "dsh-ma-button",
								disabled: readOnly || !ops.length,
								onClick: () => {
									setDraft(core.clone(baseline));
									setFailure("");
								},
							},
							tr("action.undo"),
						),
						e(
							"button",
							{
								type: "button",
								className: "dsh-ma-button dsh-ma-primary",
								disabled: readOnly || !ops.length,
								onClick: save,
							},
							tr(busy ? "action.saving" : "action.apply"),
						),
					),
				)
			: null,
	);
}
