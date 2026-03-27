import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireSession, ok, badRequest, notFound, internalError } from '@/lib/api-auth'
import { auditLog } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

const PatchSchema = z.object({
  resolved: z.literal(true),
  notes: z.string().max(500).optional(),
})

type Params = { params: Promise<{ id: string }> }

// PATCH /api/v1/reconciliation/[id] — Resolver item
// INT-106 | ANALYTICS_080: não encontrado | COMP-001: auditLog
export async function PATCH(request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response

  const { id } = await params

  let body: unknown = {}
  try { body = await request.json() } catch { /* body opcional */ }

  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return badRequest(`VAL_001: ${parsed.error.issues[0]?.message ?? 'Dados inválidos'}`)
  }

  try {
    const existing = await prisma.reconciliationItem.findUnique({ where: { id } })
    if (!existing) {
      return notFound('ANALYTICS_080: Item de reconciliação não encontrado')
    }

    const updated = await prisma.reconciliationItem.update({
      where: { id },
      data: {
        resolved: true,
        resolution: parsed.data.notes ?? null,
      },
    })

    auditLog({
      action: 'reconciliation.resolved',
      entityType: 'ReconciliationItem',
      entityId: id,
      userId: user!.id,
      leadId: existing.leadId ?? undefined,
      metadata: { type: existing.type, notes: parsed.data.notes ?? null },
    }).catch(() => {})

    return ok(updated)
  } catch {
    return internalError()
  }
}

// DELETE /api/v1/reconciliation/[id]
// INT-106 | ANALYTICS_080: não encontrado | COMP-001: auditLog
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response

  const { id } = await params

  try {
    const existing = await prisma.reconciliationItem.findUnique({ where: { id } })
    if (!existing) {
      return notFound('ANALYTICS_080: Item de reconciliação não encontrado')
    }

    await prisma.reconciliationItem.delete({ where: { id } })

    auditLog({
      action: 'reconciliation.deleted',
      entityType: 'ReconciliationItem',
      entityId: id,
      userId: user!.id,
      leadId: existing.leadId ?? undefined,
      metadata: { type: existing.type },
    }).catch(() => {})

    return ok({ success: true })
  } catch {
    return internalError()
  }
}
