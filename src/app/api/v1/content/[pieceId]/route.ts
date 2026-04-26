import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, notFound, validationError, internalError } from '@/lib/api-auth'
import { EditContentSchema } from '@/schemas/content.schema'
import { captureVersion } from '@/lib/content/versioning.service'

type Params = { params: Promise<{ pieceId: string }> }

// GET /api/v1/content/[pieceId]
export async function GET(_request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { pieceId } = await params

  try {
    const piece = await prisma.contentPiece.findUnique({
      where: { id: pieceId },
      include: {
        angles: true,
        theme: {
          select: {
            id: true,
            title: true,
            opportunityScore: true,
            rejectionCount: true,
            status: true,
          },
        },
      },
    })
    if (!piece) return notFound('Peça de conteúdo não encontrada')
    return ok(piece)
  } catch {
    return internalError()
  }
}

// PUT /api/v1/content/[pieceId] — editar texto manualmente
export async function PUT(request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response

  const { pieceId } = await params

  let body: unknown
  try { body = await request.json() } catch { return validationError(new Error('Body inválido')) }

  const parsed = EditContentSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const existing = await prisma.contentPiece.findUnique({ where: { id: pieceId } })
    if (!existing) return notFound('Peça de conteúdo não encontrada')

    // CL-076: snapshot antes da mutacao
    await captureVersion(pieceId, user?.id ?? null, 'Edicao manual de copy').catch(() => undefined)

    const updated = await prisma.contentPiece.update({
      where: { id: pieceId },
      data: { editedText: parsed.data.editedText },
    })
    return ok(updated)
  } catch {
    return internalError()
  }
}

// DELETE /api/v1/content/[pieceId] — TASK-13 ST004 (CL-239)
// Apenas rascunhos (status=DRAFT) podem ser deletados. Demais status retornam 409.
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { pieceId } = await params

  try {
    const existing = await prisma.contentPiece.findUnique({
      where: { id: pieceId },
      select: { id: true, status: true },
    })
    if (!existing) return notFound('Peça de conteúdo não encontrada')

    if (existing.status !== 'DRAFT') {
      return NextResponse.json(
        {
          success: false,
          error: 'Apenas conteúdo em rascunho (DRAFT) pode ser deletado',
          code: 'CONTENT_NOT_DRAFT',
          currentStatus: existing.status,
        },
        { status: 409 },
      )
    }

    await prisma.contentPiece.delete({ where: { id: pieceId } })
    return ok({ deleted: true, pieceId })
  } catch {
    return internalError()
  }
}
