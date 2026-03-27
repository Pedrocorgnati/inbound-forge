/**
 * Auth Helper — Integração
 *
 * Sistema é single-operator (pedro@inboundforge.dev).
 * Não há roles diferenciados — apenas operador autenticado ou não.
 *
 * Padrões:
 * - requireSession(): mockar via vi.mock('@/lib/api-auth') nos arquivos de teste
 * - requireWorkerToken(): configurar WORKER_AUTH_TOKEN via env
 */

import { NextRequest } from 'next/server'

export const TEST_OPERATOR = {
  id: 'test-operator-id-integration',
  email: 'test-integration@inboundforge.dev',
}

export const WORKER_TEST_TOKEN = process.env.WORKER_AUTH_TOKEN ?? 'test-worker-token-integration'

/**
 * Cria um NextRequest com o token de worker válido.
 * Usar nos testes de /health/heartbeat.
 */
export function makeWorkerRequest(
  url: string,
  options: { method?: string; body?: unknown } = {}
): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method: options.method ?? 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${WORKER_TEST_TOKEN}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
}

/**
 * Cria um NextRequest sem autenticação (para testar cenário 401).
 */
export function makeUnauthenticatedRequest(
  url: string,
  options: { method?: string; body?: unknown } = {}
): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method: options.method ?? 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
}

/**
 * Mock retornado por requireSession() quando operador está autenticado.
 * Usar com vi.mock('@/lib/api-auth').
 */
export const mockSessionAuthenticated = {
  user: TEST_OPERATOR,
  response: null,
}

/**
 * Mock retornado por requireSession() quando sessão é inválida.
 */
export function mockSessionUnauthorized() {
  const { NextResponse } = require('next/server')
  return {
    user: null,
    response: NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 }),
  }
}
