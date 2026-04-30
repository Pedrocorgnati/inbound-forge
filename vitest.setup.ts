/**
 * vitest.setup.ts — TASK-12 ST003
 * Configura MSW server para testes RTL/integração.
 * - listen com onUnhandledRequest='warn' (não falha em request não mockada — apenas avisa)
 * - resetHandlers entre testes (overrides de teste não vazam)
 */
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './src/tests/mocks/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
