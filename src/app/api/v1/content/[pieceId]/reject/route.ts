import { NextRequest } from 'next/server'
import { requireSession, ok, notFound, validationError, internalError } from '@/lib/api-auth'
import { RejectContentSchema } from '@/schemas/content.schema'
import { ContentApprovalService } from '@/lib/services/content-approval.service'
import { ContentNotFoundError } from '@/lib/errors/content-errors'

type Params = { params: Promise<{ pieceId: string }> }

// POST /api/v1/content/[pieceId]/reject
export async function POST(request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response

  const { pieceId } = await params

  let body: unknown
  try { body = await request.json() } catch { return validationError(new Error('Body inválido')) }

  const parsed = RejectContentSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    await ContentApprovalService.reject(
      pieceId,
      parsed.data.reason,
      user!.id,
    )

    return ok({ success: true, message: 'Peça rejeitada' })
  } catch (err) {
    if (err instanceof ContentNotFoundError) return notFound('Peça de conteúdo não encontrada')
    return internalError()
  }
}
