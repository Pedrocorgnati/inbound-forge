import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, okPaginated, validationError, internalError } from '@/lib/api-auth'
import { CreateSolutionPatternSchema } from '@/schemas/knowledge.schema'

// GET /api/v1/knowledge/patterns
export async function GET(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')))

    const [data, total] = await Promise.all([
      prisma.solutionPattern.findMany({
        include: { pain: true, case: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.solutionPattern.count(),
    ])

    return okPaginated(data, { page, limit, total })
  } catch {
    return internalError()
  }
}

// POST /api/v1/knowledge/patterns
export async function POST(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  let body: unknown
  try { body = await request.json() } catch { return validationError(new Error('Body inválido')) }

  const parsed = CreateSolutionPatternSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const entry = await prisma.solutionPattern.create({ data: parsed.data })
    return ok(entry, 201)
  } catch {
    return internalError()
  }
}
