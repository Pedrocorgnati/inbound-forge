import { NextRequest, NextResponse } from 'next/server'
import { requireSession, ok, validationError, internalError } from '@/lib/api-auth'
import { PainLibraryService } from '@/lib/services/pain-library.service'
import { UpdatePainDto } from '@/lib/dtos/pain-library.dto'

interface Params {
  params: Promise<{ id: string }>
}

/**
 * GET /api/knowledge/pains/:id
 * Retorna dor com cases vinculados (KNOWLEDGE_010 se não encontrado).
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { id } = await params
  try {
    const item = await PainLibraryService.findById(id)
    if (!item) {
      return NextResponse.json(
        { success: false, error: 'KNOWLEDGE_010', message: 'Dor não encontrada' },
        { status: 404 }
      )
    }
    return ok(item)
  } catch {
    return internalError()
  }
}

/**
 * PATCH /api/knowledge/pains/:id
 * Atualiza uma dor.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return validationError('Body inválido ou ausente')
  }

  const parsed = UpdatePainDto.safeParse(body)
  if (!parsed.success) return validationError(parsed.error.flatten())

  try {
    const existing = await PainLibraryService.findById(id)
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'KNOWLEDGE_010', message: 'Dor não encontrada' },
        { status: 404 }
      )
    }

    const updated = await PainLibraryService.update(id, parsed.data)
    return ok(updated)
  } catch {
    return internalError()
  }
}

/**
 * DELETE /api/knowledge/pains/:id
 * Remove dor + audit log. CasePain links removidos via cascade.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response

  const { id } = await params

  try {
    const existing = await PainLibraryService.findById(id)
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'KNOWLEDGE_010', message: 'Dor não encontrada' },
        { status: 404 }
      )
    }

    await PainLibraryService.delete(id, user!.id)
    return ok({ success: true })
  } catch {
    return internalError()
  }
}
