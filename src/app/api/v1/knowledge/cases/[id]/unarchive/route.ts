// TASK-17 ST004 (CL-242): endpoint de undo para arquivamento de case.
// Restaura o case do estado ARCHIVED para VALIDATED ou DRAFT.

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, notFound, internalError } from '@/lib/api-auth'
import { auditLog } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response

  const { id } = await params

  try {
    const existing = await prisma.caseLibraryEntry.findUnique({ where: { id } })
    if (!existing) return notFound('Case não encontrado')

    const nextStatus = (existing.status as string) === 'ARCHIVED' ? 'DRAFT' as const : existing.status
    const updated = await prisma.caseLibraryEntry.update({
      where: { id },
      data: { status: nextStatus },
    })

    if (user?.id) {
      await auditLog({
        action: 'case.unarchived',
        entityType: 'CaseLibraryEntry',
        entityId: id,
        userId: user.id,
        metadata: { previousStatus: existing.status, nextStatus },
      }).catch(() => undefined)
    }

    return ok(updated)
  } catch {
    return internalError()
  }
}
