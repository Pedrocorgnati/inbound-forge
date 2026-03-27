// GET /api/v1/themes/:id | PATCH /api/v1/themes/:id
// Módulo: module-7-theme-scoring-engine (TASK-1/ST002 + TASK-2/ST004)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, notFound, internalError, validationError } from '@/lib/api-auth'
import { apiError } from '@/constants/errors'

type Params = { params: Promise<{ id: string }> }

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(_request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { id } = await params

  try {
    const theme = await prisma.theme.findUnique({
      where: { id },
      include: {
        pain: { select: { id: true, title: true, description: true } },
        case: { select: { id: true, name: true, outcome: true } },
        solutionPattern: { select: { id: true, name: true, description: true } },
        nicheOpportunity: { select: { id: true, isGeoReady: true } },
        contentPieces: {
          select: { id: true, status: true, recommendedChannel: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    })

    if (!theme) {
      const { status, body } = apiError('THEME_080')
      return NextResponse.json(body, { status })
    }

    return ok(theme)
  } catch {
    return internalError()
  }
}

// ─── PATCH ────────────────────────────────────────────────────────────────────
// Atualiza campos simples (title, isNew). Para reject/restore, usar endpoints dedicados:
//   POST /api/v1/themes/:id/reject
//   POST /api/v1/themes/:id/restore

export async function PATCH(request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return validationError(new Error('Body inválido'))
  }

  const patch = body as Record<string, unknown>

  try {
    const theme = await prisma.theme.findUnique({ where: { id }, select: { id: true, status: true } })
    if (!theme) {
      const { status, body: errBody } = apiError('THEME_080')
      return NextResponse.json(errBody, { status })
    }

    // Campos atualizáveis via PATCH (reject/restore têm rotas dedicadas)
    const allowedFields = ['title', 'isNew'] as const
    const updateData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in patch) updateData[field] = patch[field]
    }

    if (Object.keys(updateData).length === 0) {
      return validationError(new Error('Nenhum campo válido para atualizar.'))
    }

    const updated = await prisma.theme.update({ where: { id }, data: updateData })
    return ok(updated)
  } catch {
    return internalError()
  }
}
