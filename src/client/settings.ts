import { tr } from './i18n.ts'
import type { SettingsNamespaceView, SettingsPathOp } from './types.ts'

/**
 * The settings faces this page consumes from DSH 0.2.1's shared settings
 * services (`ctx.configForms` / `ctx.settingsSchema`). DSH 0.2.1 made those
 * services the only describe reader and the only revision queue, so the page
 * never sends `expectedRevision` and never keeps a revision of its own.
 */
export interface SettingsDescribeSnapshot {
  /** `ready` persists across later failed refreshes; the held view keeps serving. */
  status: 'idle' | 'loading' | 'ready'
  /** The last good describe answer; undefined until the first success. */
  view:
    | {
        namespaces: readonly SettingsNamespaceView[]
        writable: boolean
        hasDocument: boolean
      }
    | undefined
  /** The latest refresh failure message, cleared by the next success. */
  error: string | null
}

/** The describe face `ctx.configForms.describe()` returns. */
export interface SettingsDescribeFace {
  getSnapshot(): SettingsDescribeSnapshot
  subscribe(listener: () => void): () => void
  ensure(): Promise<void>
}

/** One namespace's ordered write queue (`ctx.configForms.get(ns)`). */
export interface ConfigForm {
  mutate(ops: readonly SettingsPathOp[]): Promise<boolean>
}

/** The subset of a live schemastery node this page reads. */
export interface SchemaNode {
  type: string
  dict?: Record<string, SchemaNode>
  inner?: SchemaNode
  sKey?: SchemaNode
  list?: SchemaNode[]
  value?: unknown
}

/** The settings services this page needs from the client context. */
export interface SettingsServices {
  configForms: {
    describe(): SettingsDescribeFace
    get(namespace: string): ConfigForm
    whileServed(
      namespaces: readonly string[],
      register: (served: ReadonlySet<string>) => () => void,
    ): () => void
  }
  settingsSchema: {
    rehydrate(serialized: unknown): unknown
    nodeAtPath(root: unknown, path: readonly string[]): SchemaNode | undefined
  }
}

/**
 * Namespace view for one settings namespace, taken from the shared mirror.
 * @param describe - the shared describe face.
 * @param namespace - settings namespace id.
 * @returns the view, or undefined while unserved or before the first answer.
 */
export function namespaceView(
  describe: SettingsDescribeFace,
  namespace: string,
): SettingsNamespaceView | undefined {
  return describe
    .getSnapshot()
    .view?.namespaces.find((view) => view.ns === namespace)
}

/**
 * Kick the first describe read when nothing holds an answer yet. Idempotent:
 * the mirror folds concurrent calls into one wire read.
 * @param describe - the shared describe face.
 */
export function ensureDescribe(describe: SettingsDescribeFace): void {
  if (describe.getSnapshot().status === 'idle') void describe.ensure()
}

/**
 * Apply one ordered path-operation batch through the shared write queue. The
 * queue owns the revision fence and the recovery read, so a `false` answer
 * already means "the Host refused and the mirror was reloaded".
 * @param form - the namespace's shared form.
 * @param ops - ordered path operations.
 * @returns whether the Host accepted the batch.
 */
export async function writeOps(
  form: ConfigForm,
  ops: readonly SettingsPathOp[],
): Promise<boolean> {
  if (ops.length === 0) return true
  return await form.mutate(ops)
}

/**
 * The message shown when a queued write was refused. The shared queue has
 * already reloaded the document, so the draft is stale rather than corrupt.
 * @returns the localized conflict message.
 */
export function conflictMessage(): string {
  return tr('validation.writeConflict')
}

/**
 * Read one object node's declared field names, in schema order.
 * @param schema - settings schema service.
 * @param view - the namespace view carrying the serialized schema.
 * @param path - path from the section root to the object node.
 * @returns the declared keys, or an empty list when the node is absent.
 */
export function objectFields(
  schema: SettingsServices['settingsSchema'],
  view: SettingsNamespaceView | undefined,
  path: readonly string[],
): string[] {
  if (view === undefined) return []
  const node = schema.nodeAtPath(schema.rehydrate(view.schema), path)
  if (node === undefined || node.type !== 'object' || node.dict === undefined)
    return []
  return Object.keys(node.dict)
}

/**
 * Read one union node's literal members, in declaration order.
 * @param schema - settings schema service.
 * @param view - the namespace view carrying the serialized schema.
 * @param path - path from the section root to the union node.
 * @returns the string members, or an empty list when the node is absent.
 */
export function unionValues(
  schema: SettingsServices['settingsSchema'],
  view: SettingsNamespaceView | undefined,
  path: readonly string[],
): string[] {
  if (view === undefined) return []
  const node = schema.nodeAtPath(schema.rehydrate(view.schema), path)
  if (node === undefined || node.type !== 'union' || node.list === undefined)
    return []
  return node.list.flatMap((member) =>
    typeof member.value === 'string' ? [member.value] : [],
  )
}

/**
 * Read the key union of one dict node, in declaration order. A union wrapper
 * around the dict (the shape `reasoningEfforts` uses) is unwrapped first.
 * @param schema - settings schema service.
 * @param view - the namespace view carrying the serialized schema.
 * @param path - path from the section root to the dict (or its union).
 * @returns the declared keys, or an empty list when the node is absent.
 */
export function dictKeys(
  schema: SettingsServices['settingsSchema'],
  view: SettingsNamespaceView | undefined,
  path: readonly string[],
): string[] {
  if (view === undefined) return []
  let node = schema.nodeAtPath(schema.rehydrate(view.schema), path)
  if (node?.type === 'union')
    node = node.list?.find((member) => member.type === 'dict')
  if (node?.type !== 'dict') return []
  return (
    node.sKey?.list?.flatMap((member) =>
      typeof member.value === 'string' ? [member.value] : [],
    ) ?? []
  )
}
