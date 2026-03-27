import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import path from 'path'

/**
 * Configuração Vitest para testes de INTEGRAÇÃO.
 * Usa banco de dados de teste separado — NUNCA mock de banco.
 *
 * Para executar:
 *   bun run test:integration
 *   # ou com env local:
 *   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/inbound_forge_test bun run test:integration
 *
 * Requer:
 *   .env.test configurado com DATABASE_URL apontando para banco de teste
 *   WORKER_AUTH_TOKEN configurado em .env.test
 */
export default defineConfig(({ mode }) => {
  // Carrega .env.test automaticamente quando mode='test'
  const env = loadEnv(mode, process.cwd(), '')
  return {
    test: {
      globals: true,
      environment: 'node',
      include: ['tests/integration/**/*.test.ts'],
      setupFiles: ['tests/integration/setup.ts'],
      // Sequencial — testes de integração compartilham banco
      pool: 'forks',
      poolOptions: {
        forks: {
          singleFork: true,
        },
      },
      testTimeout: 30_000,
      hookTimeout: 30_000,
      reporters: ['verbose'],
      // Carrega vars do .env.test
      env: {
        NODE_ENV: 'test',
        ...env,
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    envDir: process.cwd(),
  }
})
