// POST /api/v1/themes/:id/restore
// Módulo: module-7-theme-scoring-engine (TASK-2/ST004)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, internalError } from '@/lib/api-auth'
import { apiError } from '@/constants/errors'
import { THEME_STATUS } from '@/constants/status'

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { id } = await params

  try {
    const theme = await prisma.theme.findUnique({
      where: { id },
      select: { id: true, status: true, archivedAt: true },
    })

    if (!theme) {
      const { status, body } = apiError('THEME_080')
      return NextResponse.json(body, { status })
    }

    // TASK-7 ST002: restore agora reage a archivedAt (canonico) OU status=REJECTED (legacy).
    const isArchived = theme.archivedAt !== null || theme.status === THEME_STATUS.REJECTED
    if (!isArchived) {
      const { status, body } = apiError('THEME_052')
      return NextResponse.json(body, { status })
    }

    // TASK-7 ST002 (CL-TH-016): zera archivedAt + fields legacy de rejeicao.
    // Preserva status (caller decide se quer reativar via endpoint separado).
    // Para compat com UI existente, se vier de status=REJECTED reativa para ACTIVE
    // (manter comportamento observavel anterior ate consumidores migrarem).
    const updated = await prisma.theme.update({
      where: { id },
      data: {
        status: theme.status === THEME_STATUS.REJECTED ? THEME_STATUS.ACTIVE : theme.status,
        rejectionReason: null,
        rejectedAt: null,
        rejectedBy: null,
        archivedAt: null,
      },
    })
    return ok(updated)
  } catch {
    return internalError()
  }
}
