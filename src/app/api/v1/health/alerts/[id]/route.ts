import { NextRequest } from 'next/server'
import { requireSession, ok, validationError, notFound, internalError } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { AlertResolvePatchSchema } from '@/schemas/health.schema'

export const runtime = 'nodejs'

// PATCH /api/v1/health/alerts/[id] — marcar alerta como resolvido
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { response } = await requireSession()
  if (response) return response

  // RESOLVED: G007 — safeParse para retornar 422 em vez de 500 para input inválido
  let body: unknown
  try { body = await request.json() } catch { return validationError(new Error('Body inválido')) }

  const parsed = AlertResolvePatchSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const existing = await prisma.alertLog.findUnique({ where: { id } })
    if (!existing) return notFound('Alerta não encontrado')

    const updated = await prisma.alertLog.update({
      where: { id },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        // resolvedNote não existe no schema — ignorar
      },
    })

    return ok({
      id: updated.id,
      service: updated.type,
      severity: updated.severity,
      message: updated.message,
      occurredAt: updated.createdAt.toISOString(),
      resolved: updated.resolved,
    })
  } catch {
    return internalError()
  }
}
