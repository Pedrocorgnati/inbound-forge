import { NextRequest } from 'next/server'
import { requireSession, ok, notFound, validationError, internalError } from '@/lib/api-auth'
import { SolutionPatternService } from '@/lib/services/solution-pattern.service'
import { UpdatePatternDto } from '@/lib/dtos/solution-pattern.dto'

/** Contrato canonico /api/v1/knowledge/patterns/[id] (TASK-032). GET/PATCH/DELETE via SolutionPatternService. */
type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response
  const { id } = await params
  try {
    const item = await SolutionPatternService.findById(id)
    if (!item) return notFound('Pattern não encontrado')
    return ok(item)
  } catch { return internalError() }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response
  const { id } = await params
  let body: unknown
  try { body = await request.json() } catch { return validationError('Body inválido ou ausente') }
  const parsed = UpdatePatternDto.safeParse(body)
  if (!parsed.success) return validationError(parsed.error.flatten())
  try {
    const existing = await SolutionPatternService.findById(id)
    if (!existing) return notFound('Pattern não encontrado')
    const updated = await SolutionPatternService.update(id, parsed.data)
    return ok(updated)
  } catch { return internalError() }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response
  const { id } = await params
  try {
    const existing = await SolutionPatternService.findById(id)
    if (!existing) return notFound('Pattern não encontrado')
    await SolutionPatternService.delete(id, user!.id)
    return ok({ message: 'Pattern removido' })
  } catch { return internalError() }
}
