// TASK-3 ST001 (CL-129) — Endpoint leve para contador de itens pendentes.
// GET /api/v1/reconciliation/pending-count
// Retorna `{ count: number, lastRunAt: string | null }` — usado pelo badge
// no header para evitar trazer listagem paginada completa.

import { NextResponse } from 'next/server'
import { requireSession, internalError } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const { response } = await requireSession()
  if (response) return response

  try {
    const [count, last] = await Promise.all([
      prisma.reconciliationItem.count({ where: { resolved: false } }),
      prisma.reconciliationItem.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        count,
        lastRunAt: last?.createdAt?.toISOString() ?? null,
      },
    })
  } catch {
    return internalError()
  }
}
