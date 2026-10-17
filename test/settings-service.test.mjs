import test from 'node:test'
import assert from 'node:assert/strict'

import {
  dictKeys,
  ensureDescribe,
  namespaceView,
  objectFields,
  unionValues,
  writeOps,
} from '../src/client/settings.ts'

/** The schema path segment the route probe uses (mirrors the official page). */
const PROBE = '\u0000probe'

/** One serialized schema node, shaped the way schemastery's toJSON emits it. */
function schemaNode(overrides) {
  return { type: 'any', ...overrides }
}

/** A namespace view carrying a tiny but structurally faithful schema. */
function namespaceViewOf(ns, nodes, overrides = {}) {
  return {
    ns,
    schema: nodes,
    value: {},
    user: {},
    revision: 3,
    ...overrides,
  }
}

function describeFace(view, status = 'ready') {
  return {
    snapshot: { status, view, error: null },
    ensured: 0,
    getSnapshot() {
      return this.snapshot
    },
    subscribe() {
      return () => {}
    },
    async ensure() {
      this.ensured += 1
    },
  }
}

/** A schema face resolving paths against a plain node map. */
function schemaFace() {
  return {
    rehydrate: (value) => value,
    nodeAtPath(root, path) {
      let node = root
      for (const key of path) {
        if (node === undefined) return undefined
        if (node.type === 'object') node = node.dict?.[key]
        else if (node.type === 'dict' || node.type === 'array')
          node = node.inner
        else return undefined
      }
      return node
    },
  }
}

test('namespaceView reads one namespace out of the shared describe answer', () => {
  const view = {
    namespaces: [namespaceViewOf('llm-pi-ai'), namespaceViewOf('llm-deepseek')],
    writable: true,
    hasDocument: true,
  }
  assert.equal(
    namespaceView(describeFace(view), 'llm-deepseek').ns,
    'llm-deepseek',
  )
  assert.equal(namespaceView(describeFace(view), 'llm-missing'), undefined)
  assert.equal(
    namespaceView(describeFace(undefined, 'idle'), 'llm-pi-ai'),
    undefined,
  )
})

test('ensureDescribe only starts a read from the idle state', async () => {
  const idle = describeFace(undefined, 'idle')
  ensureDescribe(idle)
  await Promise.resolve()
  assert.equal(idle.ensured, 1)

  const ready = describeFace(undefined, 'ready')
  ensureDescribe(ready)
  await Promise.resolve()
  assert.equal(ready.ensured, 0)
})

test('writeOps delegates to the shared queue without a revision fence', async () => {
  const calls = []
  const form = {
    async mutate(...args) {
      calls.push(args)
      return true
    },
  }
  assert.equal(await writeOps(form, []), true)
  assert.deepEqual(calls, [])

  const ops = [{ op: 'set', path: ['providers', 'x'], value: {} }]
  assert.equal(await writeOps(form, ops), true)
  // One argument only: the queue owns the revision fence.
  assert.deepEqual(calls, [[ops]])
})

test('writeOps reports a refused write so the page can surface the conflict', async () => {
  const form = { mutate: async () => false }
  assert.equal(
    await writeOps(form, [{ op: 'unset', path: ['providers', 'x'] }]),
    false,
  )
})

test('objectFields reads the declared keys of an object node in schema order', () => {
  const schema = schemaFace()
  const nodes = schemaNode({
    type: 'object',
    dict: {
      apiKeyEnv: schemaNode({ type: 'string' }),
      baseURL: schemaNode({ type: 'string' }),
      models: schemaNode({ type: 'array' }),
    },
  })
  const view = namespaceViewOf('llm-pi-ai', nodes)
  assert.deepEqual(objectFields(schema, view, []), [
    'apiKeyEnv',
    'baseURL',
    'models',
  ])
  assert.deepEqual(objectFields(schema, undefined, []), [])
  assert.deepEqual(objectFields(schema, view, ['missing']), [])
})

test('unionValues reads the protocol union the adapter accepts', () => {
  const schema = schemaFace()
  const nodes = schemaNode({
    type: 'object',
    dict: {
      providers: schemaNode({
        type: 'dict',
        inner: schemaNode({
          type: 'object',
          dict: {
            api: schemaNode({
              type: 'union',
              list: [
                schemaNode({ type: 'const', value: 'openai-completions' }),
                schemaNode({ type: 'const', value: 'openai-responses' }),
                schemaNode({ type: 'const', value: 'anthropic-messages' }),
              ],
            }),
          },
        }),
      }),
    },
  })
  const view = namespaceViewOf('llm-pi-ai', nodes)
  assert.deepEqual(unionValues(schema, view, ['providers', PROBE, 'api']), [
    'openai-completions',
    'openai-responses',
    'anthropic-messages',
  ])
  assert.deepEqual(unionValues(schema, view, ['providers', 'probe']), [])
})

test('dictKeys unwraps the union around reasoningEfforts', () => {
  const schema = schemaFace()
  const nodes = schemaNode({
    type: 'object',
    dict: {
      providers: schemaNode({
        type: 'dict',
        inner: schemaNode({
          type: 'object',
          dict: {
            models: schemaNode({
              type: 'array',
              inner: schemaNode({
                type: 'object',
                dict: {
                  reasoningEfforts: schemaNode({
                    type: 'union',
                    list: [
                      schemaNode({ type: 'const', value: false }),
                      schemaNode({
                        type: 'dict',
                        inner: schemaNode({ type: 'string' }),
                        sKey: schemaNode({
                          type: 'union',
                          list: [
                            schemaNode({ type: 'const', value: 'off' }),
                            schemaNode({ type: 'const', value: 'high' }),
                            schemaNode({ type: 'const', value: 'max' }),
                          ],
                        }),
                      }),
                    ],
                  }),
                },
              }),
            }),
          },
        }),
      }),
    },
  })
  const view = namespaceViewOf('llm-pi-ai', nodes)
  assert.deepEqual(
    dictKeys(schema, view, [
      'providers',
      PROBE,
      'models',
      '0',
      'reasoningEfforts',
    ]),
    ['off', 'high', 'max'],
  )
})
