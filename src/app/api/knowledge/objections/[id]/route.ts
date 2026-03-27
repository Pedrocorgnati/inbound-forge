import { NextRequest, NextResponse } from 'next/server'
import { requireSession, ok, validationError, internalError } from '@/lib/api-auth'
import { ObjectionService } from '@/lib/services/objection.service'
import { UpdateObjectionDto } from '@/lib/dtos/objection.dto'

interface Params {
  params: Promise<{ id: string }>
}

/**
 * GET /api/knowledge/objections/:id
 * KNOWLEDGE_030 se não encontrado.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { id } = await params
  try {
    const item = await ObjectionService.findById(id)
    if (!item) {
      return NextResponse.json(
        { success: false, error: 'KNOWLEDGE_030', message: 'Objeção não encontrada' },
        { status: 404 }
      )
    }
    return ok(item)
  } catch {
    return internalError()
  }
}

/**
 * PATCH /api/knowledge/objections/:id
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

  const parsed = UpdateObjectionDto.safeParse(body)
  if (!parsed.success) return validationError(parsed.error.flatten())

  try {
    const existing = await ObjectionService.findById(id)
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'KNOWLEDGE_030', message: 'Objeção não encontrada' },
        { status: 404 }
      )
    }

    const updated = await ObjectionService.update(id, parsed.data)
    return ok(updated)
  } catch {
    return internalError()
  }
}

/**
 * DELETE /api/knowledge/objections/:id
 * Audit log obrigatório (COMP-001).
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response

  const { id } = await params

  try {
    const existing = await ObjectionService.findById(id)
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'KNOWLEDGE_030', message: 'Objeção não encontrada' },
        { status: 404 }
      )
    }

    await ObjectionService.delete(id, user!.id)
    return ok({ success: true })
  } catch {
    return internalError()
  }
}
