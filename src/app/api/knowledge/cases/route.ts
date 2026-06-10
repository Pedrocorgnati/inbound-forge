import { NextRequest } from 'next/server'
import { GET as v1GET, POST as v1POST } from '@/app/api/v1/knowledge/cases/route'
import { proxyToV1, legacySuccessorPath } from '@/lib/deprecation-shim'

/**
 * @deprecated Use /api/v1/knowledge/cases.
 * Rota legada deprecada (TASK-031) — proxy in-process para o twin v1 reconciliado.
 * Sunset: 2026-06-30. NAO adicionar logica nova aqui — editar o handler v1.
 */
const ROUTE = '/api/knowledge/cases'
const TARGET = '/api/v1/knowledge/cases'

export function GET(request: NextRequest) {
  const successor = legacySuccessorPath(new URL(request.url).pathname)
  return proxyToV1(() => v1GET(request), successor, { route: ROUTE, target: TARGET })
}

export function POST(request: NextRequest) {
  const successor = legacySuccessorPath(new URL(request.url).pathname)
  return proxyToV1(() => v1POST(request), successor, { route: ROUTE, target: TARGET })
}
