import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@core': r('./src/core'),
      '@content': r('./src/content'),
      '@engine': r('./src/engine'),
      '@platform': r('./src/platform'),
      '@obs': r('./src/observability'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts', 'tools/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/engine/**',
        'src/main.ts',
        'src/**/index.ts',
        'src/**/types.ts',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
        // The domain layer carries the rules; it is held to a higher bar.
        'src/core/**/*.ts': {
          lines: 90,
          functions: 90,
          branches: 85,
          statements: 90,
        },
      },
    },
  },
})
