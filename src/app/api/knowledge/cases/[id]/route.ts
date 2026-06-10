import { NextRequest } from 'next/server'
import { GET as v1GET, PATCH as v1PATCH, DELETE as v1DELETE } from '@/app/api/v1/knowledge/cases/[id]/route'
import { proxyToV1, legacySuccessorPath } from '@/lib/deprecation-shim'

/**
 * @deprecated Use /api/v1/knowledge/cases/[id].
 * Rota legada deprecada (TASK-032) — proxy in-process para o twin v1 reconciliado.
 * Sunset: 2026-06-30. NAO adicionar logica nova aqui — editar o handler v1.
 */
type Ctx = { params: Promise<{ id: string }> }
const ROUTE = '/api/knowledge/cases/[id]'
const TARGET = '/api/v1/knowledge/cases/[id]'

export function GET(request: NextRequest, context: Ctx) {
  const successor = legacySuccessorPath(new URL(request.url).pathname)
  return proxyToV1(() => v1GET(request, context), successor, { route: ROUTE, target: TARGET })
}

export function PATCH(request: NextRequest, context: Ctx) {
  const successor = legacySuccessorPath(new URL(request.url).pathname)
  return proxyToV1(() => v1PATCH(request, context), successor, { route: ROUTE, target: TARGET })
}

export function DELETE(request: NextRequest, context: Ctx) {
  const successor = legacySuccessorPath(new URL(request.url).pathname)
  return proxyToV1(() => v1DELETE(request, context), successor, { route: ROUTE, target: TARGET })
}
