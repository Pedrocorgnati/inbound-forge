import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    exclude: [
      // Testes de infraestrutura — requerem servidor + banco rodando (G003a)
      'src/tests/api-contracts/**',
      'src/tests/contracts/**',
      'src/tests/e2e/**',
      // Testes de integração — requerem banco de dados real (vitest.integration.config.ts)
      'tests/integration/**',
      'tests/a11y/**',
      'tests/mobile/**',
      // Testes que requerem Redis (G003a)
      'src/lib/__tests__/api-usage-tracker.test.ts',
      // Teste de integração com banco real (G003c)
      'src/lib/services/__tests__/theme-generation.service.test.ts',
      // Testes de integração em src/tests (banco real)
      'src/tests/integration/**',
      // Testes unitários que requerem banco real
      'src/tests/unit/lgpd-purge.test.ts',
      // Testes de performance — requerem banco real + config dedicada (npm run test:perf)
      'src/__tests__/performance/**',
      // Workers têm configs vitest próprias — não coletar no contexto da app
      'workers/**',
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
      'server-only': path.resolve(__dirname, './__mocks__/server-only.ts'),
    },
  },
})
