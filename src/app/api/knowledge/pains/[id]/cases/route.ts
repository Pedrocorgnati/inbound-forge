import { NextRequest, NextResponse } from 'next/server'
import { requireSession, ok, validationError, internalError } from '@/lib/api-auth'
import { PainLibraryService } from '@/lib/services/pain-library.service'
import { LinkCaseDto } from '@/lib/dtos/pain-library.dto'

interface Params {
  params: Promise<{ id: string }>
}

/**
 * POST /api/knowledge/pains/:id/cases
 * Vincula um case a uma dor (transação atômica DB-002).
 */
export async function POST(request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response

  const { id: painId } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return validationError('Body inválido ou ausente')
  }

  const parsed = LinkCaseDto.safeParse(body)
  if (!parsed.success) return validationError(parsed.error.flatten())

  // Verificar que a dor existe
  const pain = await PainLibraryService.findById(painId)
  if (!pain) {
    return NextResponse.json(
      { success: false, error: 'KNOWLEDGE_010', message: 'Dor não encontrada' },
      { status: 404 }
    )
  }

  try {
    const result = await PainLibraryService.linkCase(painId, parsed.data.caseId, user!.id)
    return ok(result, 201)
  } catch {
    return internalError('Erro ao vincular case. Transação revertida.')
  }
}

interface ParamsWithCase {
  params: Promise<{ id: string; caseId: string }>
}

/**
 * DELETE /api/knowledge/pains/:id/cases/:caseId
 * Remove vínculo case↔dor em transação.
 */
export async function DELETE(_req: NextRequest, { params }: ParamsWithCase) {
  const { user, response } = await requireSession()
  if (response) return response

  const { id: painId, caseId } = await params

  try {
    const result = await PainLibraryService.unlinkCase(painId, caseId, user!.id)
    if (result.notFound) {
      return NextResponse.json(
        { success: false, error: 'KNOWLEDGE_010', message: 'Vínculo não encontrado' },
        { status: 404 }
      )
    }
    return ok(result)
  } catch {
    return internalError('Erro ao desvincular case. Transação revertida.')
  }
}
