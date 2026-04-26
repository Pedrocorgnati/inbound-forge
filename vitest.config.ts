import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    exclude: [
      // Testes de infraestrutura — requerem servidor + banco rodando (G003a)
      'src/tests/api-contracts/**',
      'src/tests/contracts/**',
      'src/tests/e2e/**',
      // Testes que requerem Redis (G003a)
      'src/lib/__tests__/api-usage-tracker.test.ts',
      // Teste de integração com banco real (G003c)
      'src/lib/services/__tests__/theme-generation.service.test.ts',
      // Default
      'node_modules/**',
    ],
    coverage: {
      provider: 'v8',
      thresholds: { lines: 80, functions: 80, branches: 80 },
    },
    reporters: ['verbose', ['json', { outputFile: 'docs/a11y/content-audit-report.json' }]],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
