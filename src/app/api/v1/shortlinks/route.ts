/**
 * POST /api/v1/shortlinks — cria shortlink rastreavel para CTA externo
 * GET  /api/v1/shortlinks — lista shortlinks com paginacao + clickCount
 *
 * Intake-Review TASK-1 (CL-275): tracking de WhatsApp + afiliados via redirect interno.
 */
import { NextRequest } from 'next/server'
import crypto from 'crypto'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, okPaginated, validationError, internalError } from '@/lib/api-auth'
import { auditLog } from '@/lib/audit'

const CreateSchema = z.object({
  targetUrl: z.string().url().max(2048),
  channel: z.enum(['whatsapp', 'blog', 'affiliate', 'linkedin', 'instagram', 'other']),
  utmSource: z.string().max(50).optional(),
  utmMedium: z.string().max(50).optional(),
  utmCampaign: z.string().max(255).optional(),
  utmContent: z.string().max(255).optional(),
  utmTerm: z.string().max(255).optional(),
  postId: z.string().uuid().optional(),
})

const ListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  channel: z.string().optional(),
})

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

/** Gera shortId de 8 caracteres base64url (colisao ~ 1 em 2.8e14). */
function generateShortId(): string {
  return crypto.randomBytes(6).toString('base64url').slice(0, 8)
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireSession()
  if (response) return response

  let body: unknown
  try { body = await request.json() } catch { return validationError(new Error('Body invalido')) }

  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    // Gera shortId unico (retry ate 5x em caso de colisao)
    let shortId = ''
    for (let i = 0; i < 5; i++) {
      const candidate = generateShortId()
      const existing = await prisma.shortlink.findUnique({ where: { shortId: candidate } })
      if (!existing) { shortId = candidate; break }
    }
    if (!shortId) return internalError()

    const shortlink = await prisma.shortlink.create({
      data: {
        shortId,
        targetUrl: parsed.data.targetUrl,
        channel: parsed.data.channel,
        utmSource: parsed.data.utmSource,
        utmMedium: parsed.data.utmMedium,
        utmCampaign: parsed.data.utmCampaign,
        utmContent: parsed.data.utmContent,
        utmTerm: parsed.data.utmTerm,
        postId: parsed.data.postId,
      },
    })

    await auditLog({
      action: 'shortlink.created',
      entityType: 'Shortlink',
      entityId: shortlink.id,
      userId: user!.id,
      metadata: { shortId, channel: parsed.data.channel, postId: parsed.data.postId },
    })

    return ok({ ...shortlink, url: `${BASE_URL}/go/${shortId}` }, 201)
  } catch {
    return internalError()
  }
}

export async function GET(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  const { searchParams } = new URL(request.url)
  const parsed = ListSchema.safeParse({
    page: searchParams.get('page'),
    limit: searchParams.get('limit'),
    channel: searchParams.get('channel') ?? undefined,
  })
  if (!parsed.success) return validationError(parsed.error)

  const { page, limit, channel } = parsed.data
  const where = channel ? { channel } : {}

  try {
    const [data, total] = await Promise.all([
      prisma.shortlink.findMany({
        where,
        orderBy: { clickCount: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.shortlink.count({ where }),
    ])

    return okPaginated(
      data.map((s) => ({ ...s, url: `${BASE_URL}/go/${s.shortId}` })),
      { page, limit, total },
    )
  } catch {
    return internalError()
  }
}
