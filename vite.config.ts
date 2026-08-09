import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@core': r('./src/core'),
      '@content': r('./src/content'),
      '@engine': r('./src/engine'),
      '@platform': r('./src/platform'),
      '@obs': r('./src/observability'),
    },
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
  server: {
    port: 5173,
  },
})
