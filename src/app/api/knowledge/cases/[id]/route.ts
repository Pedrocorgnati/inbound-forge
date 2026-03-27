import { NextRequest } from 'next/server'
import { requireSession, ok, validationError, internalError } from '@/lib/api-auth'
import { NextResponse } from 'next/server'
import { CaseLibraryService } from '@/lib/services/case-library.service'
import { UpdateCaseDto } from '@/lib/dtos/case-library.dto'

interface Params {
  params: Promise<{ id: string }>
}

/**
 * GET /api/knowledge/cases/:id
 * Retorna um case por ID (KNOWLEDGE_001 se não encontrado).
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { id } = await params
  try {
    const item = await CaseLibraryService.findById(id)
    if (!item) {
      return NextResponse.json(
        { success: false, error: 'KNOWLEDGE_001', message: 'Case não encontrado' },
        { status: 404 }
      )
    }
    return ok(item)
  } catch {
    return internalError()
  }
}

/**
 * PATCH /api/knowledge/cases/:id
 * Atualiza um case. Publicar: isDraft=false → status=VALIDATED.
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

  const parsed = UpdateCaseDto.safeParse(body)
  if (!parsed.success) return validationError(parsed.error.flatten())

  try {
    const existing = await CaseLibraryService.findById(id)
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'KNOWLEDGE_001', message: 'Case não encontrado' },
        { status: 404 }
      )
    }

    const updated = await CaseLibraryService.update(id, parsed.data)
    return ok(updated)
  } catch {
    return internalError()
  }
}

/**
 * DELETE /api/knowledge/cases/:id
 * Remove um case e grava audit log (COMP-001).
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response

  const { id } = await params

  try {
    const existing = await CaseLibraryService.findById(id)
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'KNOWLEDGE_001', message: 'Case não encontrado' },
        { status: 404 }
      )
    }

    await CaseLibraryService.delete(id, user!.id)
    return ok({ success: true })
  } catch {
    return internalError()
  }
}
