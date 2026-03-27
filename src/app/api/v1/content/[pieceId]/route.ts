import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, notFound, validationError, internalError } from '@/lib/api-auth'
import { EditContentSchema } from '@/schemas/content.schema'

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
  const { response } = await requireSession()
  if (response) return response

  const { pieceId } = await params

  let body: unknown
  try { body = await request.json() } catch { return validationError(new Error('Body inválido')) }

  const parsed = EditContentSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const existing = await prisma.contentPiece.findUnique({ where: { id: pieceId } })
    if (!existing) return notFound('Peça de conteúdo não encontrada')

    const updated = await prisma.contentPiece.update({
      where: { id: pieceId },
      data: { editedText: parsed.data.editedText },
    })
    return ok(updated)
  } catch {
    return internalError()
  }
}
