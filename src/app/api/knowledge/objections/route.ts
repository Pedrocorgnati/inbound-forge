import { NextRequest } from 'next/server'
import { requireSession, ok, okPaginated, validationError, internalError } from '@/lib/api-auth'
import { ObjectionService } from '@/lib/services/objection.service'
import { CreateObjectionDto, ListObjectionsQueryDto } from '@/lib/dtos/objection.dto'

/**
 * GET /api/knowledge/objections
 * Lista objeções com filtro por tipo e paginação.
 */
export async function GET(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries())
  const parsed = ListObjectionsQueryDto.safeParse(searchParams)
  if (!parsed.success) return validationError(parsed.error.message)

  try {
    const result = await ObjectionService.findAll(parsed.data)
    return okPaginated(result.data, {
      page: result.page,
      limit: result.limit,
      total: result.total,
    })
  } catch {
    return internalError()
  }
}

/**
 * POST /api/knowledge/objections
 * Cria objeção. Requer content (min 5) e type válido.
 */
export async function POST(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return validationError('Body inválido ou ausente')
  }

  const parsed = CreateObjectionDto.safeParse(body)
  if (!parsed.success) return validationError(parsed.error.flatten())

  try {
    const created = await ObjectionService.create(parsed.data)
    return ok(created, 201)
  } catch {
    return internalError()
  }
}
