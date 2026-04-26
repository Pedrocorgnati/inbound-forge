import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, okPaginated, validationError, internalError } from '@/lib/api-auth'
import { createPostSchema as CreatePostSchema, listPostsSchema as ListPostsSchema } from '@/lib/validators/post'
import { PUBLISHING_CHANNELS } from '@/lib/constants/publishing'
import { CONTENT_STATUS } from '@/constants/status'

// GET /api/v1/posts
export async function GET(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  // RESOLVED: G007 — safeParse para retornar 422 em vez de 500 para parâmetros inválidos
  const { searchParams } = new URL(request.url)
  const listResult = ListPostsSchema.safeParse({
    page: searchParams.get('page'),
    limit: searchParams.get('limit'),
    channel: searchParams.get('channel'),
    status: searchParams.get('status'),
    from: searchParams.get('from'),
    to: searchParams.get('to'),
  })
  if (!listResult.success) return validationError(listResult.error)
  const parsed = listResult.data

  try {
    const where: Record<string, unknown> = {}
    if (parsed.channel) where.channel = parsed.channel
    if (parsed.status) where.status = parsed.status
    if (parsed.from || parsed.to) {
      where.scheduledAt = {
        ...(parsed.from ? { gte: new Date(parsed.from) } : {}),
        ...(parsed.to ? { lte: new Date(parsed.to) } : {}),
      }
    }

    const [data, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: { scheduledAt: 'asc' },
        skip: (parsed.page - 1) * parsed.limit,
        take: parsed.limit,
      }),
      prisma.post.count({ where }),
    ])

    return okPaginated(data, { page: parsed.page, limit: parsed.limit, total })
  } catch {
    return internalError()
  }
}

// POST /api/v1/posts
export async function POST(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  let body: unknown
  try { body = await request.json() } catch { return validationError(new Error('Body inválido')) }

  const parsed = CreatePostSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  // POST_051: Canal não suportado para o tipo de conteúdo
  const channelConfig = PUBLISHING_CHANNELS[parsed.data.channel as keyof typeof PUBLISHING_CHANNELS]
  if (channelConfig?.imageRequired && !parsed.data.imageUrl) {
    return NextResponse.json(
      { code: 'POST_051', message: 'Canal não suportado para este tipo de conteúdo.' },
      { status: 422 }
    )
  }

  try {
    const post = await prisma.post.create({
      data: {
        ...parsed.data,
        scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
        status: CONTENT_STATUS.DRAFT,
      },
    })
    return ok(post, 201)
  } catch {
    return internalError()
  }
}
