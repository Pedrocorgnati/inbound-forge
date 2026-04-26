import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, notFound, validationError, internalError } from '@/lib/api-auth'
import { UpdateObjectionSchema } from '@/schemas/knowledge.schema'
import { auditLog } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

// PUT /api/v1/knowledge/objections/[id]
export async function PUT(request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { id } = await params

  let body: unknown
  try { body = await request.json() } catch { return validationError(new Error('Body inválido')) }

  const parsed = UpdateObjectionSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const existing = await prisma.objection.findUnique({ where: { id } })
    if (!existing) return notFound('Objeção não encontrada')

    const updated = await prisma.objection.update({ where: { id }, data: parsed.data })
    return ok(updated)
  } catch {
    return internalError()
  }
}

// TASK-2 ST003 (CL-247): DELETE handler — remove objecao.
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response

  const { id } = await params

  try {
    const existing = await prisma.objection.findUnique({ where: { id } })
    if (!existing) return notFound('Objeção não encontrada')

    await prisma.objection.delete({ where: { id } })
    if (user?.id) {
      await auditLog({
        action: 'delete_objection',
        entityType: 'Objection',
        entityId: id,
        userId: user.id,
        metadata: { type: existing.type },
      }).catch(() => undefined)
    }

    return new Response(null, { status: 204 })
  } catch {
    return internalError()
  }
}
