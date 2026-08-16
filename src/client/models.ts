import * as React from "react";
import * as primitives from "@deepseek-ai/dsh-client-ui-primitives";
import * as core from "./core.ts";
import * as controls from "./controls.ts";
import type { ModelProfile } from "./core.ts";

export interface ModelFormProps {
	model: ModelProfile;
	onChange: (model: ModelProfile) => void;
	disabled?: boolean;
	includeId?: boolean;
}

export interface DiscoveryProbe {
	clientApi: {
		llm: {
			discoverModels(input: unknown): Promise<core.RpcEnvelope>;
		};
	};
	settingsNs?: string;
	provider?: string;
	baseURL?: string;
	api?: string;
	apiKey?: string;
}

export interface DiscoveredModel {
	id?: string;
	name?: string;
	description?: string;
	contextWindow?: number;
	maxTokens?: number;
}

export interface ModelDiscoveryDialogProps {
	probe: DiscoveryProbe;
	existing: Set<string>;
	onApply: (models: ModelProfile[]) => void;
	onClose: () => void;
}

export interface ModelListProps {
	value?: ModelProfile[] | Record<string, ModelProfile>;
	onChange: (value: ModelProfile[] | Record<string, ModelProfile>) => void;
	disabled?: boolean;
	override?: boolean;
	probe?: DiscoveryProbe;
}

export interface OfficialModelListProps {
	value?: ModelProfile[];
	onChange: (value: ModelProfile[]) => void;
	disabled?: boolean;
}

const e = React.createElement;
const tr = core.tr;
const TextInput = controls.TextInput;
const CapacityInput = controls.CapacityInput;
const Modalities = controls.Modalities;
const ReasoningMap = controls.KeyValueList;
const CompatEditor = controls.CompatEditor;

function isObject(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function clone<T>(value: T): T {
	if (Array.isArray(value)) return value.map((item) => clone(item)) as T;
	if (isObject(value))
		return Object.fromEntries(
			Object.entries(value).map(([key, item]) => [key, clone(item)]),
		) as T;
	return value;
}

function setField<T extends object>(
	source: T | undefined,
	field: string,
	value: unknown,
): T {
	const next = clone({ ...(source || {}) }) as Record<string, unknown>;
	if (value === undefined) delete next[field];
	else next[field] = clone(value);
	return next as T;
}

function choice(value: string, label?: string) {
	return e(
		"option",
		{ key: value, value },
		label === undefined ? value : label,
	);
}

function errorMessage(error: unknown) {
	return error instanceof Error ? error.message : String(error);
}

function responseValue<T = unknown>(response: core.RpcEnvelope): T {
	if (!response.result.ok) throw new Error(response.result.error.message);
	return response.result.value as T;
}

export function ModelForm({
	model,
	onChange,
	disabled,
	includeId,
}: ModelFormProps) {
	const set = (field: string, value: unknown) =>
		onChange(setField(model, field, value));
	return e(
		"div",
		{ className: "dsh-ma-grid" },
		includeId
			? e(
					"label",
					{ className: "dsh-ma-field" },
					e(
						"span",
						{ className: "dsh-ma-field-label" },
						tr("models.field.id"),
					),
					e(TextInput, {
						value: model.id,
						disabled,
						onChange: (value) => set("id", value),
					}),
				)
			: null,
		e(
			"label",
			{ className: "dsh-ma-field" },
			e(
				"span",
				{ className: "dsh-ma-field-label" },
				tr("models.field.name"),
			),
			e(TextInput, {
				value: model.name,
				disabled,
				onChange: (value) => set("name", value),
			}),
		),
		e(
			"label",
			{ className: "dsh-ma-field" },
			e(
				"span",
				{ className: "dsh-ma-field-label" },
				tr("models.field.contextWindow"),
			),
			e(CapacityInput, {
				value: model.contextWindow,
				disabled,
				placeholder: "256K",
				ariaLabelKey: "models.field.contextWindow",
				onChange: (value) => set("contextWindow", value),
			}),
		),
		e(
			"label",
			{ className: "dsh-ma-field" },
			e(
				"span",
				{ className: "dsh-ma-field-label" },
				tr("models.field.maxTokens"),
			),
			e(CapacityInput, {
				value: model.maxTokens,
				disabled,
				placeholder: "32K",
				ariaLabelKey: "models.field.maxTokens",
				onChange: (value) => set("maxTokens", value),
			}),
		),
		e(
			"div",
			{ className: "dsh-ma-field" },
			e(
				"span",
				{ className: "dsh-ma-field-label" },
				tr("models.field.input"),
			),
			e(Modalities, {
				value: model.input,
				disabled,
				onChange: (value) =>
					set("input", value.length === 0 ? undefined : value),
			}),
		),
		e(
			"div",
			{ className: "dsh-ma-field dsh-ma-wide" },
			e(
				"span",
				{ className: "dsh-ma-field-label" },
				tr("models.field.reasoningEfforts"),
			),
			e(
				"select",
				{
					className: "dsh-ma-select",
					disabled,
					value:
						model.reasoningEfforts === false
							? "disabled"
							: isObject(model.reasoningEfforts)
								? "custom"
								: "inherit",
					onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
						set(
							"reasoningEfforts",
							event.target.value === "inherit"
								? undefined
								: event.target.value === "disabled"
									? false
									: { low: "low" },
						),
				},
				choice("inherit", tr("models.reasoning.inherit")),
				choice("disabled", tr("models.reasoning.disabled")),
				choice("custom", tr("models.reasoning.custom")),
			),
			isObject(model.reasoningEfforts)
				? e(ReasoningMap, {
						kind: "efforts",
						value: model.reasoningEfforts,
						disabled,
						onChange: (value) => set("reasoningEfforts", value),
					})
				: null,
		),
		e(
			"div",
			{ className: "dsh-ma-field dsh-ma-wide" },
			e(
				"span",
				{ className: "dsh-ma-field-label" },
				tr("models.field.compat"),
			),
			e(CompatEditor, {
				value: model.compat,
				disabled,
				onChange: (value) => set("compat", value),
			}),
		),
	);
}

export function ModelDiscoveryDialog({
	probe,
	existing,
	onApply,
	onClose,
}: ModelDiscoveryDialogProps) {
	const [status, setStatus] = React.useState("loading");
	const [candidates, setCandidates] = React.useState<DiscoveredModel[]>([]);
	const [picked, setPicked] = React.useState<Set<string>>(() => new Set());
	const [query, setQuery] = React.useState("");
	const [failure, setFailure] = React.useState("");
	React.useEffect(() => {
		let active = true;
		const load = async () => {
			try {
				const request: {
					settingsNs: string;
					provider?: string;
					baseURL?: string;
					api?: string;
					apiKey?: string;
				} = { settingsNs: probe.settingsNs || "llm-pi-ai" };
				if (probe.provider) request.provider = probe.provider;
				if (probe.baseURL) request.baseURL = probe.baseURL;
				if (probe.api) request.api = probe.api;
				if (probe.apiKey) request.apiKey = probe.apiKey;
				const response = responseValue<{ models?: DiscoveredModel[] }>(
					await probe.clientApi.llm.discoverModels(request),
				);
				if (active) {
					setCandidates(
						Array.isArray(response.models) ? response.models : [],
					);
					setStatus("ready");
				}
			} catch (error) {
				if (active) {
					setFailure(errorMessage(error));
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
	const filtered = candidates.filter(
		(candidate) =>
			!needle ||
			String(candidate.id).toLowerCase().includes(needle) ||
			String(candidate.name || "")
				.toLowerCase()
				.includes(needle),
	);
	// Only models that are not already configured can be added.
	const selectable = filtered.filter(
		(candidate) => !existing.has(candidate.id ?? ""),
	);
	const allSelected =
		selectable.length > 0 &&
		selectable.every((candidate) => picked.has(candidate.id ?? ""));
	const toggleAll = () =>
		setPicked((current) => {
			const next = new Set(current);
			if (allSelected)
				selectable.forEach((candidate) => next.delete(candidate.id ?? ""));
			else selectable.forEach((candidate) => next.add(candidate.id ?? ""));
			return next;
		});
	const selected = selectable.filter((candidate) =>
		picked.has(candidate.id ?? ""),
	);
	const footer = e(
		"div",
		{ className: "dsh-ma-actions" },
		e(
			"button",
			{ type: "button", className: "dsh-ma-button", onClick: onClose },
			tr("models.discovery.cancel"),
		),
		e(
			"button",
			{
				type: "button",
				className: "dsh-ma-button dsh-ma-primary",
				disabled: selected.length === 0,
				onClick: () => onApply(selected),
			},
			tr(
				selected.length > 0
					? "models.discovery.confirm"
					: "models.discovery.pickRequired",
				{ count: selected.length },
			),
		),
	);
	return e(
		primitives.Modal,
		{
			open: true,
			onClose,
			title: tr("models.discovery.title"),
			closeLabel: tr("models.discovery.close"),
			description: tr("models.discovery.description"),
			footer,
		},
		status === "loading"
			? e(
					"p",
					{ className: "dsh-ma-status" },
					tr("models.discovery.loading"),
				)
			: null,
		status === "error"
			? e(
					"p",
					{ className: "dsh-ma-status dsh-ma-error", role: "alert" },
					failure,
				)
			: null,
		status === "ready"
			? e(
					"div",
					{ className: "dsh-ma-group" },
					e("input", {
						className: "dsh-ma-input",
						type: "search",
						value: query,
						placeholder: tr("models.discovery.searchPlaceholder"),
						"aria-label": tr("models.discovery.searchLabel"),
						onChange: (event) => setQuery(event.target.value),
					}),
					e(
						"label",
						{ className: "dsh-ma-check" },
						e("input", {
							type: "checkbox",
							checked: allSelected,
							disabled: selectable.length === 0,
							onChange: toggleAll,
						}),
						tr("models.discovery.selectFiltered"),
					),
					e(
						"div",
						{ className: "dsh-ma-models" },
						filtered.map((candidate) => {
							const exists = existing.has(candidate.id ?? "");
							return e(
								"label",
								{
									key: candidate.id,
									className: "dsh-ma-check",
									style: exists
										? { opacity: 0.45 }
										: undefined,
								},
								e("input", {
									type: "checkbox",
									checked: picked.has(candidate.id ?? ""),
									disabled: exists,
									onChange: () =>
										setPicked((current) => {
											const next = new Set(current);
											if (!next.delete(candidate.id ?? ""))
												next.add(candidate.id ?? "");
											return next;
										}),
								}),
								e(
									"span",
									null,
									candidate.name
										? `${candidate.name} (${candidate.id})`
										: candidate.id,
								),
								typeof candidate.contextWindow === "number" ||
									typeof candidate.maxTokens === "number"
									? e(
											"span",
											{ className: "dsh-ma-route" },
											[
												typeof candidate.contextWindow ===
												"number"
													? tr(
															"models.discovery.contextWindow",
															{
																value: core.formatCapacity(
																	candidate.contextWindow,
																),
															},
														)
													: null,
												typeof candidate.maxTokens ===
												"number"
													? tr(
															"models.discovery.maxTokens",
															{
																value: core.formatCapacity(
																	candidate.maxTokens,
																),
															},
														)
													: null,
											]
												.filter(Boolean)
												.join(" · "),
										)
									: null,
								exists
									? e(
											"span",
											{ className: "dsh-ma-route" },
											tr("models.discovery.existing"),
										)
									: null,
							);
						}),
					),
				)
			: null,
	);
}

export function ModelList({
	value,
	onChange,
	disabled,
	override,
	probe,
}: ModelListProps) {
	const [discovering, setDiscovering] = React.useState(false);
	const list = Array.isArray(value) ? value : [];
	const entries: Array<[string, ModelProfile]> = override
		? (Object.entries(isObject(value) ? value : {}) as Array<
				[string, ModelProfile]
		  >)
		: list.map(
				(item, index) => [String(index), item] as [string, ModelProfile],
		  );
	const update = (key: string, model: ModelProfile) =>
		override
			? onChange({ ...(value || {}), [key]: model })
			: onChange(
					list.map((item, index) =>
						String(index) === key ? model : item,
					),
				);
	return e(
		"div",
		{ className: "dsh-ma-wide" },
		entries.map(([key, model], index) =>
			e(
				"div",
				{ className: "dsh-ma-model", key: `${key}-${index}` },
				e(
					"div",
					{ className: "dsh-ma-model-head" },
					override
						? e("input", {
								className: "dsh-ma-input",
								style: { maxWidth: "320px" },
								value: key,
								disabled,
								placeholder: tr(
									"models.override.idPlaceholder",
								),
								onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
									const next: Record<string, ModelProfile> =
										{};
									for (const [id, item] of Object.entries(
										value || {},
									))
										next[
											id === key ? event.target.value : id
										] = item as ModelProfile;
									onChange(next);
								},
							})
						: e(
								"span",
								{ className: "dsh-ma-model-title" },
								model.id ||
									tr("models.item.fallback", {
										index: index + 1,
									}),
							),
					e(
						"button",
						{
							type: "button",
							className: "dsh-ma-button dsh-ma-icon",
							disabled,
							title: tr("models.action.remove"),
							"aria-label": tr("models.action.remove"),
							onClick: () => {
								if (override) {
									const next = {
										...(value || {}),
									} as Record<string, ModelProfile>;
									delete next[key];
									onChange(next);
								} else
									onChange(
										list.filter(
											(_, itemIndex) =>
												itemIndex !== index,
										),
									);
							},
						},
						e(primitives.IconCloseOutline16, { size: 16 }),
					),
				),
				e(ModelForm, {
					model,
					includeId: !override,
					disabled,
					onChange: (next) => update(key, next),
				}),
			),
		),
		e(
			"div",
			{ className: "dsh-ma-toolbar", style: { marginTop: "8px" } },
			e(
				"button",
				{
					type: "button",
					className: "dsh-ma-button",
					disabled,
					onClick: () => {
						if (!override) return onChange([...list, { id: "" }]);
						let index = 1;
						let id = `model-${index}`;
						while (
							Object.prototype.hasOwnProperty.call(
								value || {},
								id,
							)
						) {
							index += 1;
							id = `model-${index}`;
						}
						onChange({ ...(value || {}), [id]: {} });
					},
				},
				e(primitives.IconPlusOutline16, { size: 14 }),
				tr(
					override
						? "models.action.addOverride"
						: "models.action.add",
				),
			),
			!override && probe
				? e(
						"button",
						{
							type: "button",
							className: "dsh-ma-button",
							disabled:
								disabled || (!probe.provider && !probe.baseURL),
							onClick: () => setDiscovering(true),
						},
						tr("models.discovery.open"),
					)
				: null,
		),
		discovering && probe
			? e(ModelDiscoveryDialog, {
					probe,
					existing: new Set(
						list
							.map((model) => model.id)
							.filter((id): id is string => Boolean(id)),
					),
					onClose: () => setDiscovering(false),
					onApply: (models) => {
						const known = new Set(
							list
								.map((model) => model.id)
								.filter((id): id is string => Boolean(id)),
						);
						const additions: ModelProfile[] = [];
						for (const model of models) {
							if (!model.id || known.has(model.id)) continue;
							known.add(model.id);
							additions.push({
								id: model.id,
								...(model.name ? { name: model.name } : {}),
								...(typeof model.contextWindow === "number"
									? { contextWindow: model.contextWindow }
									: {}),
								...(typeof model.maxTokens === "number"
									? { maxTokens: model.maxTokens }
									: {}),
							});
						}
						onChange([...list, ...additions]);
						setDiscovering(false);
					},
				})
			: null,
	);
}

export function OfficialModelList({
	value,
	onChange,
	disabled,
}: OfficialModelListProps) {
	const models = Array.isArray(value) ? value : [];
	const update = (
		index: number,
		field: string,
		value: string | number | undefined,
	) =>
		onChange(
			models.map((model, modelIndex) =>
				modelIndex === index
					? setField(model, field, value === "" ? undefined : value)
					: model,
			),
		);
	return e(
		"div",
		{ className: "dsh-ma-wide" },
		models.map((model, index) =>
			e(
				"div",
				{
					className: "dsh-ma-model",
					key: `${model.id || "model"}-${index}`,
				},
				e(
					"div",
					{ className: "dsh-ma-model-head" },
					e(
						"span",
						{ className: "dsh-ma-model-title" },
						model.id ||
							tr("models.item.fallback", { index: index + 1 }),
					),
					e(
						"button",
						{
							type: "button",
							className: "dsh-ma-button dsh-ma-icon",
							disabled,
							title: tr("models.action.remove"),
							"aria-label": tr("models.action.remove"),
							onClick: () =>
								onChange(
									models.filter(
										(_, modelIndex) => modelIndex !== index,
									),
								),
						},
						e(primitives.IconCloseOutline16, { size: 16 }),
					),
				),
				e(
					"div",
					{ className: "dsh-ma-grid" },
					e(
						"label",
						{ className: "dsh-ma-field" },
						e(
							"span",
							{ className: "dsh-ma-field-label" },
							tr("models.field.id"),
						),
						e(TextInput, {
							value: model.id,
							disabled,
							onChange: (value) => update(index, "id", value),
						}),
					),
					e(
						"label",
						{ className: "dsh-ma-field" },
						e(
							"span",
							{ className: "dsh-ma-field-label" },
							tr("models.field.name"),
						),
						e(TextInput, {
							value: model.name,
							disabled,
							onChange: (value) => update(index, "name", value),
						}),
					),
					e(
						"label",
						{ className: "dsh-ma-field dsh-ma-wide" },
						e(
							"span",
							{ className: "dsh-ma-field-label" },
							tr("models.field.description"),
						),
						e(TextInput, {
							value: model.description,
							disabled,
							onChange: (value) =>
								update(index, "description", value),
						}),
					),
					e(
						"label",
						{ className: "dsh-ma-field" },
						e(
							"span",
							{ className: "dsh-ma-field-label" },
							tr("models.field.contextWindow"),
						),
						e(CapacityInput, {
							value: model.contextWindow,
							disabled,
							placeholder: "256K",
							ariaLabelKey: "models.field.contextWindow",
							onChange: (value) =>
								update(index, "contextWindow", value),
						}),
					),
					e(
						"label",
						{ className: "dsh-ma-field" },
						e(
							"span",
							{ className: "dsh-ma-field-label" },
							tr("models.field.maxTokens"),
						),
						e(CapacityInput, {
							value: model.maxTokens,
							disabled,
							placeholder: "32K",
							ariaLabelKey: "models.field.maxTokens",
							onChange: (value) =>
								update(index, "maxTokens", value),
						}),
					),
				),
			),
		),
		e(
			"button",
			{
				type: "button",
				className: "dsh-ma-button",
				disabled,
				onClick: () => onChange([...models, { id: "" }]),
			},
			e(primitives.IconPlusOutline16, { size: 14 }),
			tr("models.action.add"),
		),
	);
}
