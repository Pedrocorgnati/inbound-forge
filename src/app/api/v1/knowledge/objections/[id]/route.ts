import { NextRequest } from 'next/server'
import { requireSession, ok, notFound, validationError, internalError } from '@/lib/api-auth'
import { ObjectionService } from '@/lib/services/objection.service'
import { UpdateObjectionDto } from '@/lib/dtos/objection.dto'

/** Contrato canonico /api/v1/knowledge/objections/[id] (TASK-032). GET/PATCH/DELETE via ObjectionService. */
type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response
  const { id } = await params
  try {
    const item = await ObjectionService.findById(id)
    if (!item) return notFound('Objeção não encontrada')
    return ok(item)
  } catch { return internalError() }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response
  const { id } = await params
  let body: unknown
  try { body = await request.json() } catch { return validationError('Body inválido ou ausente') }
  const parsed = UpdateObjectionDto.safeParse(body)
  if (!parsed.success) return validationError(parsed.error.flatten())
  try {
    const existing = await ObjectionService.findById(id)
    if (!existing) return notFound('Objeção não encontrada')
    const updated = await ObjectionService.update(id, parsed.data)
    return ok(updated)
  } catch { return internalError() }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response
  const { id } = await params
  try {
    const existing = await ObjectionService.findById(id)
    if (!existing) return notFound('Objeção não encontrada')
    await ObjectionService.delete(id, user!.id)
    return ok({ message: 'Objeção removida' })
  } catch { return internalError() }
}
