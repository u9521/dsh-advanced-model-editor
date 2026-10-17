import js from '@eslint/js'
import globals from 'globals'
import ts from 'typescript-eslint'
import { defineConfig } from 'eslint/config'

/**
 * Flat ESLint config: Node globals for the build scripts and tests, browser
 * globals for the client sources, plus the typescript-eslint recommended set.
 *
 * `pnpm run lint` runs this plus the type check and the Prettier check; the
 * test suite is a separate `pnpm test` step because it needs a built `lib/`.
 */
export default defineConfig(
  {
    ignores: ['lib/**', 'node_modules/**', '.dist/**', '*.d.ts'],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ['**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },
  {
    files: ['test/**/*.mjs'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
  {
    files: ['src/**/*.ts', '**/*.mjs'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-console': 'off',
    },
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
)
