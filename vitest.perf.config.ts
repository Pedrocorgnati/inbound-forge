import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import path from 'path'

/**
 * Configuração Vitest para testes de PERFORMANCE.
 *
 * Difere de vitest.integration.config.ts em um único ponto crítico:
 *   resolve.alias['server-only'] aponta para tests/stubs/server-only.ts.
 *
 * Por que: src/lib/prisma.ts importa 'server-only' como guard de prod
 * (impede vazamento de prisma client para componentes client). Esse guard
 * impede execução em vitest CLI, então neutralizamos APENAS neste runner.
 *
 * Para executar:
 *   npm run test:perf
 *
 * Requer:
 *   .env.test com DATABASE_URL apontando para banco de teste
 *   Banco populado via prisma/seeds/themes.test.seed.ts (seedPerformanceThemes)
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    test: {
      globals: true,
      environment: 'node',
      include: ['src/__tests__/performance/**/*.test.ts'],
      pool: 'forks',
      fileParallelism: false,
      testTimeout: 60_000,
      hookTimeout: 60_000,
      reporters: ['verbose'],
      env: {
        NODE_ENV: 'test',
        ...env,
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        // Neutraliza guard `server-only` apenas neste runner.
        'server-only': path.resolve(__dirname, './tests/stubs/server-only.ts'),
      },
    },
    envDir: process.cwd(),
  }
})
