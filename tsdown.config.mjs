/**
 * tsdown config — two self-contained build halves, no external DSH checkout:
 *
 *   1. Node half    → `lib/index.js`   (ESM no-op plugin node, imported by the
 *                      profile Loader from the package root)
 *   2. Browser half → `lib/client.js`  (CJS closure factory for the DSH client
 *                      module table)
 *
 * The browser artifact must satisfy the DSH client-bundle contract exactly:
 * a single `window.__ModuleLoader__.load({ id, factory })` registration whose
 * factory resolves every platform module through the injected `require`.
 * Nothing may be bundled that the shell's frozen module table cannot answer,
 * which is why the externals list below is the whole contract in one place.
 *
 * The browser entry is the TypeScript source rather than the tsc output:
 * `scripts/build.mjs` still runs `tsc` first to type-check and emit `lib/types`,
 * but the bundle does not need that intermediate mapping.
 */
import { defineConfig } from 'tsdown'

/** Plugin id: the module-table key, stamped into the loader handoff. */
const ID = '@local/dsh-advanced-model-editor'

/**
 * Platform modules the shell shares into the frozen module table (mirrors
 * `packages/client/web/src/platform.ts` upstream). Each stays an external
 * `require`; everything else is bundled.
 */
const PLATFORM_MODULES = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-dockkit',
]

const isPlatformModule = (specifier) => PLATFORM_MODULES.includes(specifier)

export default defineConfig([
  {
    name: ID,
    entry: ['lib/types/index.js'],
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    // The client half writes into the same directory; a default clean would
    // delete whichever half was emitted first.
    clean: false,
  },
  {
    name: `${ID}/client`,
    entry: { client: 'src/client/index.ts' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    target: 'es2024',
    dts: false,
    sourcemap: true,
    clean: false,
    deps: {
      neverBundle: isPlatformModule,
      alwaysBundle: (specifier) => !isPlatformModule(specifier),
    },
    plugins: [
      {
        // Build-time mirror of the module-edge rule: a cross-plugin value import
        // would either inline a duplicate runtime instance or emit a require()
        // the frozen table cannot answer. Collaborate through cordis services
        // instead. Type-only imports are erased and never reach this gate.
        name: 'dsh-client-bundle-purity',
        resolveId(source) {
          if (!source.startsWith('@deepseek-ai/')) return null
          if (isPlatformModule(source)) return null
          throw new Error(
            `client bundle purity: "${source}" is not a platform module — ` +
              'cross-plugin value imports are forbidden; collaborate through cordis services ' +
              '(type-only imports are erased and never reach this gate)',
          )
        },
      },
    ],
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(ID)}, factory: (require) => {`,
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
])
