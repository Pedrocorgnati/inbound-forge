import { NextRequest } from 'next/server'
import { requireSession, ok, okPaginated, validationError, internalError } from '@/lib/api-auth'
import { PainLibraryService } from '@/lib/services/pain-library.service'
import { CreatePainDto, ListPainsQueryDto } from '@/lib/dtos/pain-library.dto'

/**
 * GET /api/knowledge/pains
 * Lista dores com filtro por setor e paginação.
 */
export async function GET(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries())
  const parsed = ListPainsQueryDto.safeParse(searchParams)
  if (!parsed.success) return validationError(parsed.error.message)

  try {
    const result = await PainLibraryService.findAll(parsed.data)
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
 * POST /api/knowledge/pains
 * Cria uma nova dor.
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

  const parsed = CreatePainDto.safeParse(body)
  if (!parsed.success) return validationError(parsed.error.flatten())

  try {
    const created = await PainLibraryService.create(parsed.data)
    return ok(created, 201)
  } catch {
    return internalError()
  }
}
