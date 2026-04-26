// POST /api/v1/themes/:id/reject
// Módulo: module-7-theme-scoring-engine (TASK-2/ST004)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, validationError, internalError } from '@/lib/api-auth'
import { apiError } from '@/constants/errors'
import { RejectThemeSchema } from '@/schemas/theme.schema'
import { THEME_STATUS } from '@/constants/status'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { id } = await params
  const { searchParams } = new URL(request.url)
  // TASK-7 ST002: por default rejeicao tambem arquiva (archivedAt canonico).
  // `?keep_active=true` mantem visivel para reprocessamento.
  const keepActive = searchParams.get('keep_active') === 'true'

  let body: unknown
  try { body = await request.json() } catch { return validationError(new Error('Body inválido')) }

  const parsed = RejectThemeSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const theme = await prisma.theme.findUnique({ where: { id }, select: { id: true, status: true } })

    if (!theme) {
      const { status, body: errBody } = apiError('THEME_080')
      return NextResponse.json(errBody, { status })
    }

    if (theme.status === THEME_STATUS.REJECTED) {
      const { status, body: errBody } = apiError('THEME_051')
      return NextResponse.json(errBody, { status })
    }

    const updated = await prisma.theme.update({
      where: { id },
      data: {
        status: THEME_STATUS.REJECTED,
        rejectionReason: parsed.data.reason,
        rejectedAt: new Date(),
        rejectedBy: 'operator',
        // TASK-7 ST002 (CL-TH-016): archivedAt canonico.
        archivedAt: keepActive ? null : new Date(),
      },
    })
    return ok(updated)
  } catch {
    return internalError()
  }
}
