import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, okPaginated, validationError, internalError } from '@/lib/api-auth'
import { CreatePainSchema } from '@/schemas/knowledge.schema'
import { KnowledgeStatus } from '@/constants/status'
import { buildSearchWhere } from '@/lib/search/text-search'

// GET /api/v1/knowledge/pains
// Intake-Review TASK-22 ST005 (CL-TH-054): ?search= em title/description.
export async function GET(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')))
    const status = searchParams.get('status') as KnowledgeStatus | null
    const search = searchParams.get('search') ?? undefined

    const where: Record<string, unknown> = status ? { status } : {}
    const searchWhere = buildSearchWhere(search, ['title', 'description'] as const)
    if (searchWhere) Object.assign(where, searchWhere)

    const [data, total] = await Promise.all([
      prisma.painLibraryEntry.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.painLibraryEntry.count({ where }),
    ])

    return okPaginated(data, { page, limit, total })
  } catch {
    return internalError()
  }
}

// POST /api/v1/knowledge/pains
export async function POST(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  let body: unknown
  try { body = await request.json() } catch { return validationError(new Error('Body inválido')) }

  const parsed = CreatePainSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const entry = await prisma.painLibraryEntry.create({ data: parsed.data })
    return ok(entry, 201)
  } catch {
    return internalError()
  }
}
