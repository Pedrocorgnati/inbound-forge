import { NextRequest, NextResponse } from 'next/server'
import { requireSession, ok, badRequest, notFound, internalError } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { ZodError } from 'zod'
import { AlertResolvePatchSchema } from '@/schemas/health.schema'

export const runtime = 'nodejs'

// PATCH /api/v1/health/alerts/[id] — marcar alerta como resolvido
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { response } = await requireSession()
  if (response) return response

  const { id } = params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return badRequest('Corpo inválido')
  }

  let parsed: { resolved: true; resolvedNote?: string }
  try {
    parsed = AlertResolvePatchSchema.parse(body)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validação falhou', issues: err.errors },
        { status: 422 }
      )
    }
    return badRequest('VAL_001: resolved deve ser true')
  }

  const { resolvedNote } = parsed

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
