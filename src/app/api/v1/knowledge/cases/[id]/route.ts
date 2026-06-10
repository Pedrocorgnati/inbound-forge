import { NextRequest } from 'next/server'
import { requireSession, ok, notFound, validationError, internalError } from '@/lib/api-auth'
import { CaseLibraryService } from '@/lib/services/case-library.service'
import { UpdateCaseDto } from '@/lib/dtos/case-library.dto'

/** Contrato canonico /api/v1/knowledge/cases/[id] (TASK-032). GET/PATCH/DELETE via CaseLibraryService. */
type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response
  const { id } = await params
  try {
    const item = await CaseLibraryService.findById(id)
    if (!item) return notFound('Case não encontrado')
    return ok(item)
  } catch { return internalError() }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response
  const { id } = await params
  let body: unknown
  try { body = await request.json() } catch { return validationError('Body inválido ou ausente') }
  const parsed = UpdateCaseDto.safeParse(body)
  if (!parsed.success) return validationError(parsed.error.flatten())
  try {
    const existing = await CaseLibraryService.findById(id)
    if (!existing) return notFound('Case não encontrado')
    const updated = await CaseLibraryService.update(id, parsed.data)
    return ok(updated)
  } catch { return internalError() }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response
  const { id } = await params
  try {
    const existing = await CaseLibraryService.findById(id)
    if (!existing) return notFound('Case não encontrado')
    await CaseLibraryService.delete(id, user!.id)
    return ok({ message: 'Case removido' })
  } catch { return internalError() }
}
