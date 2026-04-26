// GET /api/v1/themes/:id/sources
// Intake-Review TASK-3 ST001 (CL-196): fontes scraping que contribuiram com o tema.
// Heuristica (ressalva): nao existe FK direta Theme -> ScrapedText. Filtramos ScrapedText
// de pain candidates criados ate 7 dias antes do Theme.createdAt e, se houver painId,
// priorizamos textos cujo classificationResult->>'painId' case com theme.painId.
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSession, okPaginated, internalError, validationError } from '@/lib/api-auth'
import { apiError } from '@/constants/errors'
import { NextResponse } from 'next/server'

type Params = { params: Promise<{ id: string }> }

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export async function GET(request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const parsed = QuerySchema.safeParse({
    page: searchParams.get('page') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  })
  if (!parsed.success) return validationError(parsed.error)
  const { page, limit } = parsed.data

  try {
    const theme = await prisma.theme.findUnique({
      where: { id },
      select: { id: true, painId: true, createdAt: true },
    })
    if (!theme) {
      const { status, body } = apiError('THEME_080')
      return NextResponse.json(body, { status })
    }

    const windowStart = new Date(theme.createdAt.getTime() - 7 * 24 * 60 * 60 * 1000)
    const where: Record<string, unknown> = {
      isPainCandidate: true,
      createdAt: { gte: windowStart, lte: theme.createdAt },
    }
    if (theme.painId) {
      where.OR = [
        { classificationResult: { path: ['painId'], equals: theme.painId } },
        { classificationResult: { path: ['pain_id'], equals: theme.painId } },
      ]
    }

    const [rows, total] = await Promise.all([
      prisma.scrapedText.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          url: true,
          title: true,
          createdAt: true,
          classificationResult: true,
        },
      }),
      prisma.scrapedText.count({ where }),
    ])

    const data = rows.map((r) => ({
      id: r.id,
      url: r.url,
      title: r.title,
      createdAt: r.createdAt,
      scoreContribution:
        (r.classificationResult as { score?: number } | null)?.score ?? null,
    }))

    return okPaginated(data, { page, limit, total })
  } catch {
    return internalError()
  }
}
