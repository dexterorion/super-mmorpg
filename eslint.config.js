import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

/**
 * Layer rule (enforced, not aspirational):
 *
 *   core     ← depends on nothing
 *   content  ← depends on core only
 *   engine   ← depends on core, content, platform, observability
 *
 * If `core/` could import Phaser or touch the DOM, the headless playtest
 * harness would stop working. That is why this is a lint error and also an
 * architecture test (tests/architecture.test.ts).
 */
export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      'playtest-report/**',
      'public/atlas.png',
      'test-results/**',
      'playwright-report/**',
      'tools/ci/check-bundle-size.mjs',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['eslint.config.js'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-param-reassign': 'error',
    },
  },

  // --- Layer enforcement -------------------------------------------------
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['phaser', 'phaser/*', '@engine/*', '@platform/*', '@content/*', '@obs/*'],
              message:
                'core/ is the pure domain layer: it must not depend on Phaser, the DOM, content or adapters.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'core/ must stay headless.' },
        { name: 'document', message: 'core/ must stay headless.' },
        { name: 'localStorage', message: 'Use the SaveStorage port instead.' },
      ],
    },
  },
  {
    files: ['src/content/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['phaser', 'phaser/*', '@engine/*', '@platform/*'],
              message: 'content/ is data: it may only depend on core.',
            },
          ],
        },
      ],
    },
  },

  // --- Relaxations -------------------------------------------------------
  {
    files: ['tools/**/*.ts', 'tests/**/*.ts', '*.config.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },

  prettier
)
