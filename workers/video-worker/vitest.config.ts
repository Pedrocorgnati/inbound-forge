// Config de testes do video-worker (espelho do image-worker/vitest.config.ts).
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts', 'src/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/__tests__/**',
        'src/**/*.test.ts',
        'src/index.ts',
        'src/env.ts',
        'src/redis-client.ts',
      ],
      thresholds: { lines: 80, functions: 80, branches: 75 },
    },
  },
})
