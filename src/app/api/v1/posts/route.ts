import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, okPaginated, validationError, internalError } from '@/lib/api-auth'
import { createPostSchema as CreatePostSchema, listPostsSchema as ListPostsSchema } from '@/lib/validators/post'
import { PUBLISHING_CHANNELS } from '@/lib/constants/publishing'

// GET /api/v1/posts
export async function GET(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  try {
    const { searchParams } = new URL(request.url)
    const parsed = ListPostsSchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      channel: searchParams.get('channel'),
      status: searchParams.get('status'),
      from: searchParams.get('from'),
      to: searchParams.get('to'),
    })

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
        status: 'DRAFT',
      },
    })
    return ok(post, 201)
  } catch {
    return internalError()
  }
}
