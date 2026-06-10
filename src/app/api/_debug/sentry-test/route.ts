/**
 * Rastreabilidade: CL-297, TASK-1 ST004
 * Endpoint de smoke test para validar captura Sentry em produção.
 * Disponível apenas com token debug válido (?token=$DEBUG_TOKEN).
 * NUNCA expor sem gate de ENV — remover após validação ou manter com gate.
 */
import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

export async function GET(request: NextRequest) {
  const debugToken = process.env.DEBUG_TOKEN
  if (!debugToken) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const token = request.nextUrl.searchParams.get('token')
  if (token !== debugToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const testError = new Error('[Sentry Smoke Test] Erro proposital — TASK-1 ST004')
  testError.name = 'SentrySmokTestError'

  const eventId = Sentry.captureException(testError)

  return NextResponse.json({
    ok: true,
    message: 'Erro de teste enviado ao Sentry',
    event_id: eventId,
    timestamp: new Date().toISOString(),
  })
}
