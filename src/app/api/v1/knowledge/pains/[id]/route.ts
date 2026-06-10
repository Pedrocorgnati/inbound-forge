import { NextRequest } from 'next/server'
import { requireSession, ok, notFound, validationError, internalError } from '@/lib/api-auth'
import { PainLibraryService } from '@/lib/services/pain-library.service'
import { UpdatePainDto } from '@/lib/dtos/pain-library.dto'

/** Contrato canonico /api/v1/knowledge/pains/[id] (TASK-032). GET/PATCH/DELETE via PainLibraryService. */
type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response
  const { id } = await params
  try {
    const item = await PainLibraryService.findById(id)
    if (!item) return notFound('Dor não encontrada')
    return ok(item)
  } catch { return internalError() }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response
  const { id } = await params
  let body: unknown
  try { body = await request.json() } catch { return validationError('Body inválido ou ausente') }
  const parsed = UpdatePainDto.safeParse(body)
  if (!parsed.success) return validationError(parsed.error.flatten())
  try {
    const existing = await PainLibraryService.findById(id)
    if (!existing) return notFound('Dor não encontrada')
    const updated = await PainLibraryService.update(id, parsed.data)
    return ok(updated)
  } catch { return internalError() }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response
  const { id } = await params
  try {
    const existing = await PainLibraryService.findById(id)
    if (!existing) return notFound('Dor não encontrada')
    await PainLibraryService.delete(id, user!.id)
    return ok({ message: 'Dor removida' })
  } catch { return internalError() }
}
