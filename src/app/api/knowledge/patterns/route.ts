import { NextRequest } from 'next/server'
import { requireSession, ok, okPaginated, validationError, internalError } from '@/lib/api-auth'
import { SolutionPatternService } from '@/lib/services/solution-pattern.service'
import { CreatePatternDto, ListPatternsQueryDto } from '@/lib/dtos/solution-pattern.dto'
import { NextResponse } from 'next/server'

/**
 * GET /api/knowledge/patterns
 * Lista padrões com filtro por painId e paginação.
 */
export async function GET(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries())
  const parsed = ListPatternsQueryDto.safeParse(searchParams)
  if (!parsed.success) return validationError(parsed.error.message)

  try {
    const result = await SolutionPatternService.findAll(parsed.data)
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
 * POST /api/knowledge/patterns
 * Cria padrão com painId obrigatório.
 * Retorna KNOWLEDGE_020 se painId não pertence/não existe.
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

  const parsed = CreatePatternDto.safeParse(body)
  if (!parsed.success) return validationError(parsed.error.flatten())

  try {
    const created = await SolutionPatternService.create(parsed.data)
    return ok(created, 201)
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('KNOWLEDGE_020')) {
      return NextResponse.json(
        { success: false, error: 'KNOWLEDGE_020', message: 'painId não encontrado ou inválido' },
        { status: 403 }
      )
    }
    if (err instanceof Error && err.message.startsWith('KNOWLEDGE_001')) {
      return NextResponse.json(
        { success: false, error: 'KNOWLEDGE_001', message: 'caseId não encontrado' },
        { status: 404 }
      )
    }
    return internalError()
  }
}
