import { NextRequest } from 'next/server'
import { requireSession, ok, okPaginated, validationError, internalError } from '@/lib/api-auth'
import { CaseLibraryService } from '@/lib/services/case-library.service'
import { CreateCaseDto, ListCasesQueryDto } from '@/lib/dtos/case-library.dto'

/**
 * GET /api/knowledge/cases
 * Lista casos com paginação (max 100).
 */
export async function GET(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries())
  const parsed = ListCasesQueryDto.safeParse(searchParams)
  if (!parsed.success) return validationError(parsed.error.message)

  // Impede limit > 100 (PERF-002)
  if (parsed.data.limit > 100) return validationError('limit não pode exceder 100')

  try {
    const result = await CaseLibraryService.findAll(parsed.data)
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
 * POST /api/knowledge/cases
 * Cria um novo case.
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

  const parsed = CreateCaseDto.safeParse(body)
  if (!parsed.success) return validationError(parsed.error.flatten())

  try {
    const created = await CaseLibraryService.create(parsed.data)
    return ok(created, 201)
  } catch {
    return internalError()
  }
}
