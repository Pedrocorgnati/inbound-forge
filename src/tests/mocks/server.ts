/**
 * server.ts — MSW server para testes Vitest/RTL (TASK-12 ST003)
 *
 * Uso:
 *   - Importado em vitest.setup.ts
 *   - server.listen() em beforeAll
 *   - server.resetHandlers() em afterEach
 *   - server.close() em afterAll
 *
 * Override por teste:
 *   server.use(http.get('/api/v1/health', () => HttpResponse.json({ ... })))
 */
import { setupServer } from 'msw/node'
import { onboardingHandlers } from './handlers/onboarding'
import { healthHandlers } from './handlers/health'
import { apiUsageHandlers } from './handlers/api-usage'

export const server = setupServer(
  ...onboardingHandlers,
  ...healthHandlers,
  ...apiUsageHandlers,
)
