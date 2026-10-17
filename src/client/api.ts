import type { ModelApi, RpcEnvelope } from './types.ts'

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
export function createModelApi(ctx: any): ModelApi {
  const remote = ctx.remote

  return {
    llm: {
      async providers(): Promise<RpcEnvelope> {
        const [registeredRes, declaredRes] = await Promise.all([
          remote.llm.listProviders(),
          remote.llm.listConfigurableProviders(),
        ])
        if (!registeredRes.ok) {
          return {
            result: {
              ok: false,
              error: {
                message:
                  registeredRes.error?.message || 'Failed to list providers',
              },
            },
          }
        }
        if (!declaredRes.ok) {
          return {
            result: {
              ok: false,
              error: {
                message:
                  declaredRes.error?.message ||
                  'Failed to list configurable providers',
              },
            },
          }
        }
        const registered = registeredRes.value || []
        const declared = declaredRes.value || []
        const active = new Set(registered.map((p: any) => p.id))
        const declaredSet = new Set(
          declared.map((entry: any) => entry.provider),
        )
        const providers = declared.map((entry: any) => ({
          provider: entry.provider,
          displayName: entry.displayName,
          settingsNs: entry.settingsNs,
          settingsPath: Array.isArray(entry.settingsPath)
            ? [...entry.settingsPath]
            : [],
          active: active.has(entry.provider),
          ...(entry.declared !== undefined ? { declared: entry.declared } : {}),
          // DSH 0.2.1 directory facts: the endpoint a profile inherits, the
          // variables that build it, and the route's own authentication. A
          // keyless route must not read as "missing credential".
          ...(entry.defaultBaseURL !== undefined
            ? { defaultBaseURL: entry.defaultBaseURL }
            : {}),
          ...(entry.baseURLEnv !== undefined
            ? { baseURLEnv: [...entry.baseURLEnv] }
            : {}),
          ...(entry.nativeAuth !== undefined
            ? {
                nativeAuth: {
                  env: [...(entry.nativeAuth.env || [])],
                  oauth: entry.nativeAuth.oauth === true,
                },
              }
            : {}),
          ...(entry.error !== undefined ? { error: entry.error } : {}),
        }))
        for (const provider of registered) {
          if (declaredSet.has(provider.id)) continue
          providers.push({
            provider: provider.id,
            displayName: provider.name,
            settingsNs: '',
            settingsPath: [],
            active: true,
          })
        }
        return {
          result: {
            ok: true,
            value: { providers },
          },
        }
      },

      async discoverModels(input?: any): Promise<RpcEnvelope> {
        const settingsNs = input?.settingsNs || 'llm-pi-ai'
        const req: {
          provider?: string
          baseURL?: string
          api?: string
          apiKey?: string
        } = {}
        if (input?.provider) req.provider = input.provider
        if (input?.baseURL) req.baseURL = input.baseURL
        if (input?.api) req.api = input.api
        if (input?.apiKey) req.apiKey = input.apiKey
        const res = await remote.llm.discoverModels(settingsNs, req)
        if (!res.ok) {
          return {
            result: {
              ok: false,
              error: {
                message: res.error?.message || 'Failed to discover models',
              },
            },
          }
        }
        return {
          result: {
            ok: true,
            value: { models: res.value },
          },
        }
      },
    },

    credentials: {
      async describe(input: any): Promise<RpcEnvelope> {
        const refs = Array.isArray(input) ? input : []
        const res = await remote.credentials.describe(refs)
        if (!res.ok) {
          return {
            result: {
              ok: false,
              error: {
                message: res.error?.message || 'Failed to describe credentials',
              },
            },
          }
        }
        return {
          result: {
            ok: true,
            value: res.value,
          },
        }
      },

      async set(input: any): Promise<RpcEnvelope> {
        const res = await remote.credentials.set(input.ref, input.value)
        if (!res.ok) {
          return {
            result: {
              ok: false,
              error: {
                message: res.error?.message || 'Failed to set credential',
              },
            },
          }
        }
        return {
          result: {
            ok: true,
            value: undefined,
          },
        }
      },

      async unset(input: any): Promise<RpcEnvelope> {
        const res = await remote.credentials.unset(input.ref)
        if (!res.ok) {
          return {
            result: {
              ok: false,
              error: {
                message: res.error?.message || 'Failed to unset credential',
              },
            },
          }
        }
        return {
          result: {
            ok: true,
            value: undefined,
          },
        }
      },
    },
  }
}
