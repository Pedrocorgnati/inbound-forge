import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, notFound, validationError, internalError } from '@/lib/api-auth'
import { UpdateSolutionPatternSchema } from '@/schemas/knowledge.schema'
import { auditLog } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

// TASK-3 ST001 (CL-245): PUT completo (antes retornava 501).
export async function PUT(request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return validationError(new Error('Body inválido'))
  }

  const parsed = UpdateSolutionPatternSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const existing = await prisma.solutionPattern.findUnique({ where: { id } })
    if (!existing) return notFound('Pattern não encontrado')

    const updated = await prisma.solutionPattern.update({ where: { id }, data: parsed.data })
    if (user?.id) {
      await auditLog({
        action: 'update_pattern',
        entityType: 'SolutionPattern',
        entityId: id,
        userId: user.id,
        metadata: { fields: Object.keys(parsed.data) },
      }).catch(() => undefined)
    }
    return ok(updated)
  } catch {
    return internalError()
  }
}

// TASK-2 ST002 (CL-246): DELETE handler — remove pattern.
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response

  const { id } = await params

  try {
    const existing = await prisma.solutionPattern.findUnique({ where: { id } })
    if (!existing) return notFound('Pattern não encontrado')

    await prisma.solutionPattern.delete({ where: { id } })
    if (user?.id) {
      await auditLog({
        action: 'delete_pattern',
        entityType: 'SolutionPattern',
        entityId: id,
        userId: user.id,
        metadata: { name: existing.name },
      }).catch(() => undefined)
    }

    return new Response(null, { status: 204 })
  } catch {
    return internalError()
  }
}
