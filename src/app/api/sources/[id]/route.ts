/**
 * GET /api/sources/:id
 * PATCH /api/sources/:id
 * DELETE /api/sources/:id
 * TASK-4 ST002 / module-6-scraping-worker
 *
 * Operações sobre uma fonte específica.
 * INT-093: fontes isProtected=true não podem ser deletadas.
 * INT-136: bloqueia domínios proibidos em atualizações.
 * AUTH_001: JWT obrigatório.
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  requireSession,
  ok,
  notFound,
  validationError,
  conflict,
  internalError,
} from '@/lib/api-auth'
import { NextResponse } from 'next/server'
import { findSourceById, updateSource, deleteSource } from '@/lib/services/source.service'

const UpdateSourceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  url: z.string().url().max(1024).optional(),
  selector: z.string().max(512).nullable().optional(),
  crawlFrequency: z.enum(['hourly', 'daily', 'weekly']).optional(),
  isActive: z.boolean().optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const { user, response: authError } = await requireSession()
  if (authError) return authError

  const { id } = await params

  try {
    const source = await findSourceById(id, user!.id)
    if (!source) return notFound()
    return ok(source)
  } catch (err) {
    console.error('[Sources] GET/:id error', err instanceof Error ? err.message : 'unknown')
    return internalError()
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { user, response: authError } = await requireSession()
  if (authError) return authError

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return validationError(new Error('Body JSON inválido'))
  }

  const parsed = UpdateSourceSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const result = await updateSource(id, user!.id, parsed.data)

    if (!result.ok) {
      if (result.code === 'NOT_FOUND') return notFound()
      if (result.code === 'BLOCKED_DOMAIN') return conflict('Domínio não permitido para scraping (INT-136).')
      if (result.code === 'DUPLICATE_URL') return conflict('Esta URL já está cadastrada como fonte.')
      return NextResponse.json(
        { success: false, code: 'SRC_001', error: 'Fonte protegida não pode ser modificada.' },
        { status: 403 }
      )
    }

    return ok(result.source)
  } catch (err) {
    console.error('[Sources] PATCH/:id error', err instanceof Error ? err.message : 'unknown')
    return internalError()
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { user, response: authError } = await requireSession()
  if (authError) return authError

  const { id } = await params

  try {
    const result = await deleteSource(id, user!.id)

    if (!result.ok) {
      if (result.code === 'NOT_FOUND') return notFound()
      if (result.code === 'PROTECTED') {
        return NextResponse.json(
          { success: false, code: 'SRC_001', error: 'Fonte protegida não pode ser removida (INT-093).' },
          { status: 403 }
        )
      }
    }

    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('[Sources] DELETE/:id error', err instanceof Error ? err.message : 'unknown')
    return internalError()
  }
}
