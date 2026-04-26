/**
 * POST /api/v1/health/alerts/email
 * TASK-4 ST006 / intake-review Sad Paths UI
 *
 * Endpoint para disparo manual de email de alerta de worker (para testes).
 * AUTH_001: JWT obrigatório.
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireSession, ok, validationError, internalError } from '@/lib/api-auth'
import { sendWorkerAlert } from '@/lib/services/email-alert.service'

const Schema = z.object({
  workerType: z.enum(['SCRAPING', 'IMAGE', 'PUBLISHING']),
  status: z.string().default('ERROR'),
  errorMessage: z.string().default('Teste de alerta manual'),
})

export async function POST(request: NextRequest) {
  const { response: authError } = await requireSession()
  if (authError) return authError

  let raw: unknown
  try { raw = await request.json() } catch { return validationError(new Error('Body inválido')) }

  const parsed = Schema.safeParse(raw)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const result = await sendWorkerAlert({
      ...parsed.data,
      timestamp: new Date(),
    })
    return ok(result)
  } catch {
    return internalError()
  }
}
