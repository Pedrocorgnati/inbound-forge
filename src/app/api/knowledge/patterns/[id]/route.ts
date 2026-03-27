import { NextRequest, NextResponse } from 'next/server'
import { requireSession, ok, validationError, internalError } from '@/lib/api-auth'
import { SolutionPatternService } from '@/lib/services/solution-pattern.service'
import { UpdatePatternDto } from '@/lib/dtos/solution-pattern.dto'

interface Params {
  params: Promise<{ id: string }>
}

/**
 * GET /api/knowledge/patterns/:id
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { id } = await params
  try {
    const item = await SolutionPatternService.findById(id)
    if (!item) {
      return NextResponse.json(
        { success: false, error: 'KNOWLEDGE_021', message: 'Padrão não encontrado' },
        { status: 404 }
      )
    }
    return ok(item)
  } catch {
    return internalError()
  }
}

/**
 * PATCH /api/knowledge/patterns/:id
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

  const parsed = UpdatePatternDto.safeParse(body)
  if (!parsed.success) return validationError(parsed.error.flatten())

  try {
    const existing = await SolutionPatternService.findById(id)
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'KNOWLEDGE_021', message: 'Padrão não encontrado' },
        { status: 404 }
      )
    }

    const updated = await SolutionPatternService.update(id, parsed.data)
    return ok(updated)
  } catch {
    return internalError()
  }
}

/**
 * DELETE /api/knowledge/patterns/:id
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response

  const { id } = await params

  try {
    const existing = await SolutionPatternService.findById(id)
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'KNOWLEDGE_021', message: 'Padrão não encontrado' },
        { status: 404 }
      )
    }

    await SolutionPatternService.delete(id, user!.id)
    return ok({ success: true })
  } catch {
    return internalError()
  }
}
