/**
 * handlers.ts — TASK-REFORGE-3 ST001
 * Mock handlers para hooks de API do module-15.
 * Usado nos testes de componente via vi.mock().
 * Quando MSW for instalado (pnpm add -D msw), migrar para http.get/http.post.
 */

/** Dados de saúde padrão para testes */
export const mockHealthData = {
  status: 'ok' as const,
  services: {
    database: 'ok',
    redis: 'ok',
  },
  workers: [
    { workerId: 'w-1', type: 'SCRAPING', status: 'IDLE', lastPing: new Date().toISOString() },
    { workerId: 'w-2', type: 'IMAGE', status: 'IDLE', lastPing: new Date().toISOString() },
    { workerId: 'w-3', type: 'PUBLISHING', status: 'IDLE', lastPing: new Date().toISOString() },
  ],
  alerts: [],
  apiUsage: [],
  errorHistory: [],
  updatedAt: new Date().toISOString(),
}

/** Dados de uso de API padrão para testes */
export const mockApiUsageData = [
  { service: 'anthropic', usedTokens: 1000, limitTokens: 100000, costUSD: 0.02, resetAt: '', percentUsed: 1 },
  { service: 'ideogram', usedTokens: 500, limitTokens: 50000, costUSD: 0.01, resetAt: '', percentUsed: 1 },
]

/** Dados de progresso de onboarding padrão */
export const mockOnboardingProgress = {
  counts: { cases: 3, pains: 5, objections: 4, solutions: 4, credentials: 2 },
  thresholds: { cases: 3, pains: 5, objections: 5, solutions: 3, credentials: 2 },
  isReady: false,
  percentComplete: 70,
}
