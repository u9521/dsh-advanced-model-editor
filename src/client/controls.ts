import * as React from "react";
import * as primitives from "@deepseek-ai/dsh-client-ui-primitives";
import * as core from "./core.ts";
import type {
	BackoffConfig,
	CompatProfile,
	RetryPolicyConfig,
} from "./core.ts";

export interface FieldProps {
	labelKey: string;
	labelVars?: Record<string, string | number>;
	wide?: boolean;
	enabled?: boolean;
	readOnly?: boolean;
	onEnabled?: (value: boolean) => void;
	children?: React.ReactNode;
}

export interface TextInputProps {
	type?: string;
	value?: string | number | null;
	className?: string;
	disabled?: boolean;
	placeholder?: string;
	placeholderKey?: string;
	placeholderVars?: Record<string, string | number>;
	ariaLabelKey?: string;
	ariaLabelVars?: Record<string, string | number>;
	autoComplete?: string;
	emptyAsUndefined?: boolean;
	min?: number;
	max?: number;
	step?: number;
	onChange?: (value: string | number | undefined) => void;
}

export interface CapacityInputProps {
	value?: number;
	disabled?: boolean;
	placeholder?: string;
	ariaLabelKey?: string;
	onChange?: (value: number | undefined) => void;
}

export interface SelectProps {
	value?: string;
	onChange?: (value: string | undefined) => void;
	disabled?: boolean;
	className?: string;
	ariaLabelKey?: string;
	ariaLabelVars?: Record<string, string | number>;
	allowUnset?: boolean;
	unsetKey?: string;
	choiceKeyPrefix?: string;
	choices?: Array<
		| string
		| {
				value: string;
				label?: string;
				labelKey?: string;
				labelVars?: Record<string, string | number>;
		  }
	>;
	unsetLabel?: string;
}

export interface ProtocolSelectProps {
	value?: string;
	onChange?: (value: string | undefined) => void;
	disabled?: boolean;
	unsetKey?: string;
	ariaLabelKey?: string;
}

export interface ModalitiesProps {
	value?: string[];
	onChange?: (value: string[]) => void;
	disabled?: boolean;
}

export interface KeyValueListProps {
	kind: "headers" | "efforts" | "budgets";
	value?: Record<string, string | number | null>;
	onChange?: (value: Record<string, string | number | null>) => void;
	disabled?: boolean;
}

export interface CompatEditorProps {
	value?: CompatProfile;
	onChange?: (value: CompatProfile | undefined) => void;
	disabled?: boolean;
}

export interface RetryPolicyProps {
	value?: RetryPolicyConfig;
	onChange?: (value: RetryPolicyConfig) => void;
	disabled?: boolean;
}

const e = React.createElement;

const PROTOCOLS = core.PROTOCOLS || [
	"openai-completions",
	"openai-responses",
	"anthropic-messages",
];
const MODALITY_VALUES = core.MODALITIES || ["text", "image"];
const THINKING_LEVELS = core.THINKING_LEVELS || [
	"off",
	"minimal",
	"low",
	"medium",
	"high",
	"xhigh",
	"max",
];
const THINKING_FORMATS = core.THINKING_FORMATS || [
	"openai",
	"deepseek",
	"openrouter",
	"together",
	"zai",
	"qwen",
	"string-thinking",
	"ant-ling",
];
const DEFAULT_RETRYABLE_CODES = core.DEFAULT_RETRYABLE_CODES || [
	"EMPTY_RESPONSE",
	"RATE_LIMIT",
	"SERVER",
	"TIMEOUT",
	"TRANSPORT",
];
const MAX_TIMER_DELAY_MS = core.MAX_TIMER_DELAY_MS || 2147483647;

export const CSS = `
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
      @media(max-width:720px){.dsh-ma-grid,.dsh-ma-grid-3,.dsh-ma-subgrid{grid-template-columns:1fr}.dsh-ma-wide{grid-column:auto}.dsh-ma-kv{grid-template-columns:minmax(0,1fr) minmax(0,1fr) 32px}.dsh-ma-provider-head{align-items:flex-start;flex-wrap:wrap}}
    `;

function isObject(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function text(
	key: string | undefined,
	vars?: Record<string, string | number>,
): string {
	return core.tr(key ?? "", vars);
}

function option(
	value: string,
	labelKey: string | undefined,
	labelVars?: Record<string, string | number>,
) {
	return e(
		"option",
		{ key: String(value), value },
		text(labelKey, labelVars),
	);
}

export function Field(props: FieldProps) {
	const label = text(props.labelKey, props.labelVars);
	return e(
		"div",
		{ className: "dsh-ma-field" + (props.wide ? " dsh-ma-wide" : "") },
		e(
			"div",
			{ className: "dsh-ma-field-label" },
			props.onEnabled
				? e("input", {
						className: "dsh-ma-override",
						type: "checkbox",
						checked: props.enabled === true,
						disabled: props.readOnly === true,
						"aria-label": text("controls.field.override", {
							label,
						}),
						onChange: (event) =>
							props.onEnabled?.(event.target.checked),
					})
				: null,
			e("span", null, label),
		),
		props.children,
	);
}

export function TextInput(props: TextInputProps) {
	const type = props.type || "text";
	return e("input", {
		className:
			"dsh-ma-input" + (props.className ? " " + props.className : ""),
		type,
		value:
			props.value === undefined || props.value === null
				? ""
				: String(props.value),
		disabled: props.disabled === true,
		placeholder: props.placeholderKey
			? text(props.placeholderKey, props.placeholderVars)
			: undefined,
		"aria-label": props.ariaLabelKey
			? text(props.ariaLabelKey, props.ariaLabelVars)
			: undefined,
		min: props.min,
		max: props.max,
		step: props.step,
		autoComplete: props.autoComplete,
		onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
			const raw = event.target.value;
			props.onChange?.(
				type === "number"
					? raw === ""
						? undefined
						: Number(raw)
					: raw === "" && props.emptyAsUndefined !== false
						? undefined
						: raw,
			);
		},
	});
}

export function CapacityInput(props: CapacityInputProps) {
	// Keystrokes are held here so typing `1000` does not get rewritten to `1K`
	// mid-word; the stored count is patched in the same breath, and the buffer
	// is dropped once it agrees with the outside value (or loses focus).
	const [buffer, setBuffer] = React.useState<string | undefined>(undefined);
	React.useEffect(() => {
		setBuffer((current) => {
			if (current === undefined) return current;
			const parsed = core.parseCapacity(current);
			const synced =
				parsed === undefined
					? props.value === undefined
					: parsed === props.value;
			return synced ? current : undefined;
		});
	}, [props.value]);
	const display =
		buffer ??
		(props.value === undefined ? "" : core.formatCapacity(props.value));
	return e("input", {
		className: "dsh-ma-input",
		type: "text",
		inputMode: "numeric",
		value: display,
		disabled: props.disabled === true,
		placeholder: props.placeholder,
		"aria-label": props.ariaLabelKey
			? text(props.ariaLabelKey)
			: undefined,
		onBlur: () => setBuffer(undefined),
		onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
			const raw = event.target.value;
			setBuffer(raw);
			const parsed = core.parseCapacity(raw);
			if (parsed === undefined) props.onChange?.(undefined);
			else if (!Number.isNaN(parsed)) props.onChange?.(parsed);
		},
	});
}

export function Select(props: SelectProps) {
	const choices = Array.isArray(props.choices) ? props.choices : [];
	return e(
		"select",
		{
			className:
				"dsh-ma-select" +
				(props.className ? " " + props.className : ""),
			value:
				props.value === undefined || props.value === null
					? ""
					: String(props.value),
			disabled: props.disabled === true,
			"aria-label": props.ariaLabelKey
				? text(props.ariaLabelKey, props.ariaLabelVars)
				: undefined,
			onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
				props.onChange?.(
					event.target.value === "" ? undefined : event.target.value,
				),
		},
		props.allowUnset === false
			? null
			: option("", props.unsetKey || "controls.select.unset"),
		choices.map((choice) => {
			const value = typeof choice === "string" ? choice : choice.value;
			const labelKey =
				typeof choice === "string"
					? props.choiceKeyPrefix
						? props.choiceKeyPrefix + "." + choice
						: choice
					: choice.labelKey;
			return option(
				value,
				labelKey,
				typeof choice === "string" ? undefined : choice.labelVars,
			);
		}),
	);
}

export function ProtocolSelect(props: ProtocolSelectProps) {
	return e(Select, {
		value: props.value,
		onChange: props.onChange,
		disabled: props.disabled,
		choices: PROTOCOLS,
		choiceKeyPrefix: "controls.protocol",
		unsetKey: props.unsetKey || "controls.select.unset",
		ariaLabelKey: props.ariaLabelKey || "controls.protocol.label",
	});
}

export function Modalities(props: ModalitiesProps) {
	const selected = Array.isArray(props.value) ? props.value : [];
	return e(
		"div",
		{ className: "dsh-ma-checks" },
		MODALITY_VALUES.map((item) =>
			e(
				"label",
				{ key: item, className: "dsh-ma-check" },
				e("input", {
					type: "checkbox",
					checked: selected.includes(item),
					disabled: props.disabled === true,
					onChange: (event) =>
						props.onChange?.(
							event.target.checked
								? [...selected, item]
								: selected.filter((entry) => entry !== item),
						),
				}),
				text("controls.modality." + item),
			),
		),
	);
}

export function KeyValueList(props: KeyValueListProps) {
	const values = isObject(props.value) ? props.value : {};
	const entries = Object.entries(values);
	const levels = props.kind === "efforts";
	const setEntry = (
		from: string,
		to: string | number | undefined,
		nextValue: string | number | null | undefined,
	) => {
		const next: Record<string, string | number | null> = {};
		for (const [key, value] of entries)
			next[(key === from ? to : key) as string] =
				key === from ? (nextValue as string | number | null) : value;
		props.onChange?.(next);
	};
	const add = () => {
		if (levels) {
			const available = THINKING_LEVELS.find(
				(level) => !Object.prototype.hasOwnProperty.call(values, level),
			);
			if (available !== undefined)
				props.onChange?.({
					...values,
					[available]: available === "off" ? null : available,
				});
			return;
		}
		let index = 1;
		let name = "X-Custom-" + index;
		while (Object.prototype.hasOwnProperty.call(values, name)) {
			index += 1;
			name = "X-Custom-" + index;
		}
		props.onChange?.({ ...values, [name]: "" });
	};
	return e(
		"div",
		{ className: "dsh-ma-wide" },
		entries.map(([key, value], index) =>
			e(
				"div",
				{ className: "dsh-ma-kv", key: key + "-" + index },
				levels
					? e(Select, {
							value: key,
							disabled: props.disabled,
							allowUnset: false,
							choices: THINKING_LEVELS,
							choiceKeyPrefix: "controls.reasoningLevel",
							onChange: (nextKey) =>
								setEntry(key, nextKey, value),
						})
					: e(TextInput, {
							value: key,
							disabled: props.disabled,
							emptyAsUndefined: false,
							placeholderKey:
								"controls.keyValue.headers.keyPlaceholder",
							onChange: (nextKey) =>
								setEntry(key, nextKey, value),
						}),
				e(TextInput, {
					value: value === null ? "" : value,
					disabled: props.disabled,
					emptyAsUndefined: false,
					placeholderKey:
						levels && key === "off"
							? "controls.keyValue.efforts.offValuePlaceholder"
							: levels
								? "controls.keyValue.efforts.valuePlaceholder"
								: "controls.keyValue.headers.valuePlaceholder",
					onChange: (nextValue) =>
						setEntry(
							key,
							key,
							levels && key === "off" && nextValue === ""
								? null
								: nextValue,
						),
				}),
				e(
					"button",
					{
						type: "button",
						className: "dsh-ma-button dsh-ma-icon",
						disabled: props.disabled === true,
						title: text("controls.keyValue.remove"),
						"aria-label": text("controls.keyValue.remove"),
						onClick: () => {
							const next = { ...values };
							delete next[key];
							props.onChange?.(next);
						},
					},
					e(primitives.IconCloseOutline16, { size: 16 }),
				),
			),
		),
		e(
			"button",
			{
				type: "button",
				className: "dsh-ma-button",
				disabled:
					props.disabled === true ||
					(levels && entries.length === THINKING_LEVELS.length),
				style: { marginTop: "8px" },
				onClick: add,
			},
			e(primitives.IconPlusOutline16, { size: 14 }),
			text(
				levels
					? "controls.keyValue.efforts.add"
					: "controls.keyValue.headers.add",
			),
		),
	);
}

export function CompatEditor(props: CompatEditorProps) {
	const compat = isObject(props.value) ? props.value : {};
	const set = (field: string, value: unknown) => {
		const next = { ...compat };
		if (value === undefined) delete next[field];
		else next[field] = value;
		props.onChange?.(Object.keys(next).length === 0 ? undefined : next);
	};
	return e(
		"div",
		{ className: "dsh-ma-grid" },
		e(
			Field,
			{ labelKey: "controls.compat.thinkingFormat" },
			e(Select, {
				value: compat.thinkingFormat as string | undefined,
				choices: THINKING_FORMATS,
				choiceKeyPrefix: "controls.thinkingFormat",
				disabled: props.disabled,
				unsetKey: "controls.select.auto",
				onChange: (value) => set("thinkingFormat", value),
			}),
		),
		e(
			Field,
			{ labelKey: "controls.compat.supportsReasoningEffort" },
			e(Select, {
				value:
					typeof compat.supportsReasoningEffort === "boolean"
						? String(compat.supportsReasoningEffort)
						: undefined,
				choices: [
					{ value: "true", labelKey: "controls.boolean.supported" },
					{
						value: "false",
						labelKey: "controls.boolean.unsupported",
					},
				],
				disabled: props.disabled,
				unsetKey: "controls.select.auto",
				onChange: (value) =>
					set(
						"supportsReasoningEffort",
						value === undefined ? undefined : value === "true",
					),
			}),
		),
	);
}

export function RetryPolicy(props: RetryPolicyProps) {
	const policy = (isObject(props.value)
		? props.value
		: {
				mode: "normal",
				maxRetries: 2,
				retryableCodes: [...DEFAULT_RETRYABLE_CODES],
				backoff: {
					initialDelayMs: 500,
					maxDelayMs: 10000,
					jitterRatio: 0.1,
				},
			}) as RetryPolicyConfig & Record<string, unknown>;
	const backoff = (isObject(policy.backoff) ? policy.backoff : {}) as BackoffConfig;
	const set = (field: string, value: unknown) =>
		props.onChange?.({ ...policy, [field]: value } as RetryPolicyConfig);
	const setBackoff = (field: string, value: unknown) =>
		props.onChange?.({
			...policy,
			backoff: { ...backoff, [field]: value },
		} as RetryPolicyConfig);
	return e(
		"div",
		{ className: "dsh-ma-grid dsh-ma-wide" },
		e(
			Field,
			{ labelKey: "controls.retry.modeLabel" },
			e(Select, {
				value: policy.mode === "always" ? "always" : "normal",
				allowUnset: false,
				disabled: props.disabled,
				choices: [
					{ value: "normal", labelKey: "controls.retry.mode.normal" },
					{ value: "always", labelKey: "controls.retry.mode.always" },
				],
				onChange: (mode) =>
					props.onChange?.(
						mode === "always"
							? { mode: "always", backoff }
							: {
									mode: "normal",
									maxRetries:
										policy.maxRetries === undefined
											? 2
											: policy.maxRetries,
									retryableCodes: policy.retryableCodes || [
										...DEFAULT_RETRYABLE_CODES,
									],
									backoff,
								},
					),
			}),
		),
		policy.mode !== "always"
			? e(
					Field,
					{ labelKey: "controls.retry.maxRetries" },
					e(TextInput, {
						type: "number",
						min: 0,
						step: 1,
						value: policy.maxRetries,
						disabled: props.disabled,
						onChange: (value) => set("maxRetries", value),
					}),
				)
			: null,
		policy.mode !== "always"
			? e(
					Field,
					{ labelKey: "controls.retry.retryableCodes", wide: true },
					e(TextInput, {
						value: Array.isArray(policy.retryableCodes)
							? policy.retryableCodes.join(", ")
							: "",
						disabled: props.disabled,
						emptyAsUndefined: false,
						onChange: (value) =>
							set(
								"retryableCodes",
								String(value)
									.split(/[,\s]+/)
									.map((item) => item.trim())
									.filter(Boolean),
							),
					}),
				)
			: null,
		e(
			Field,
			{ labelKey: "controls.retry.initialDelayMs" },
			e(TextInput, {
				type: "number",
				min: 1,
				max: MAX_TIMER_DELAY_MS,
				value: backoff.initialDelayMs,
				disabled: props.disabled,
				onChange: (value) => setBackoff("initialDelayMs", value),
			}),
		),
		e(
			Field,
			{ labelKey: "controls.retry.maxDelayMs" },
			e(TextInput, {
				type: "number",
				min: 1,
				max: MAX_TIMER_DELAY_MS,
				value: backoff.maxDelayMs,
				disabled: props.disabled,
				onChange: (value) => setBackoff("maxDelayMs", value),
			}),
		),
		e(
			Field,
			{ labelKey: "controls.retry.jitterRatio" },
			e(TextInput, {
				type: "number",
				min: 0,
				max: 1,
				step: 0.01,
				value: backoff.jitterRatio,
				disabled: props.disabled,
				onChange: (value) => setBackoff("jitterRatio", value),
			}),
		),
	);
}
