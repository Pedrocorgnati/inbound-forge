// POST /api/v1/themes/:id/restore
// Módulo: module-7-theme-scoring-engine (TASK-2/ST004)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, internalError } from '@/lib/api-auth'
import { apiError } from '@/constants/errors'

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { id } = await params

  try {
    const theme = await prisma.theme.findUnique({ where: { id }, select: { id: true, status: true } })

    if (!theme) {
      const { status, body } = apiError('THEME_080')
      return NextResponse.json(body, { status })
    }

    if (theme.status !== 'REJECTED') {
      const { status, body } = apiError('THEME_052')
      return NextResponse.json(body, { status })
    }

    const updated = await prisma.theme.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        rejectionReason: null,
        rejectedAt: null,
        rejectedBy: null,
      },
    })
    return ok(updated)
  } catch {
    return internalError()
  }
}
