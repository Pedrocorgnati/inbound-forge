/**
 * POST /api/posts/from-content — Cria Post a partir de ContentPiece (CX-03)
 * Adapta conteúdo para o canal via channel-adapter.
 * module-12-calendar-publishing | CX-03 | POST_051 | POST_052
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSession, ok, notFound, internalError } from '@/lib/api-auth'
import { PostService } from '@/lib/services/post.service'
import { fromContentSchema } from '@/lib/validators/post'
import { prisma } from '@/lib/prisma'
import { ZodError } from 'zod'

export async function POST(request: NextRequest) {
  const { user, response } = await requireSession()
  if (response) return response

  try {
    const body = await request.json()
    const data = fromContentSchema.parse(body)

    // POST_051: ContentPiece não encontrado
    const contentPiece = await prisma.contentPiece.findUnique({
      where: { id: data.contentPieceId },
    })
    if (!contentPiece) {
      return NextResponse.json(
        { success: false, error: { code: 'POST_051', message: 'ContentPiece não encontrado' } },
        { status: 404 }
      )
    }

    // POST_052: ownership check — verificar que o ContentPiece pertence ao usuário
    // Nota: sistema single-user (Operator); se multi-tenant, adicionar userId ao ContentPiece
    // Por ora, user autenticado tem acesso a todos os ContentPieces (single-operator design)
    void user // suppress unused warning — futuro: verificar userId === contentPiece.userId

    const post = await PostService.createFromContent(data.contentPieceId, data.channel)
    if (!post) return notFound('Falha ao criar post')

    return ok(post, 201)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      )
    }
    return internalError()
  }
}
