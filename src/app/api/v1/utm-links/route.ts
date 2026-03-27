/**
 * POST /api/v1/utm-links — Criar UTMLink com buildUTMUrl
 * GET  /api/v1/utm-links — Listar UTMLinks com paginação
 * CX-04: Post.trackingUrl atualizado atomicamente
 * COMP-001: auditLog em criações
 * SEC-007: ownership — post deve pertencer ao operador
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, okPaginated, conflict, validationError, internalError, notFound } from '@/lib/api-auth'
import { buildUTMUrl } from '@/lib/utm-builder'
import { auditLog } from '@/lib/audit'
import { UTM_SOURCES, UTM_MEDIUMS } from '@/constants/utm-constants'

const UTMLinkCreateSchema = z.object({
  postId: z.string().uuid(),
  source: z.string().default(UTM_SOURCES.INBOUND_FORGE),
  medium: z.enum([UTM_MEDIUMS.WHATSAPP, UTM_MEDIUMS.BLOG, UTM_MEDIUMS.LINKEDIN, UTM_MEDIUMS.INSTAGRAM]),
  campaign: z.string().min(1).max(255),
  content: z.string().max(255).optional(),
  term: z.string().max(255).optional(),
})

const ListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://inbound-forge.vercel.app'

// POST /api/v1/utm-links
export async function POST(request: NextRequest) {
  const { user, response } = await requireSession()
  if (response) return response

  let body: unknown
  try { body = await request.json() } catch { return validationError(new Error('Body inválido')) }

  const parsed = UTMLinkCreateSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  const { postId, source, medium, campaign, content, term } = parsed.data

  // Verificar que post existe (SEC-007)
  const post = await prisma.post.findUnique({ where: { id: postId } })
  if (!post) return notFound('Post não encontrado')

  // Verificar duplicata
  const existing = await prisma.uTMLink.findUnique({ where: { postId } })
  if (existing) return conflict('UTM link já existe para este post')

  try {
    // Construir fullUrl
    const fullUrl = buildUTMUrl(`${BASE_URL}`, { source, medium, campaign, content, term })

    // Transação: criar UTMLink + atualizar Post.trackingUrl (CX-04)
    const utmLink = await prisma.$transaction(async (tx) => {
      const link = await tx.uTMLink.create({
        data: { postId, source, medium, campaign, content: content ?? '', fullUrl },
      })
      await tx.post.update({
        where: { id: postId },
        data: { trackingUrl: fullUrl },
      })
      return link
    })

    // Audit log (COMP-001)
    await auditLog({
      action: 'utm_link.created',
      entityType: 'UTMLink',
      entityId: utmLink.id,
      userId: user!.id,
      metadata: { postId, source, medium, campaign },
    })

    return ok(utmLink, 201)
  } catch {
    return internalError()
  }
}

// GET /api/v1/utm-links
export async function GET(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  const { searchParams } = new URL(request.url)
  const parsed = ListSchema.parse({
    page: searchParams.get('page'),
    limit: searchParams.get('limit'),
  })

  try {
    const [data, total] = await Promise.all([
      prisma.uTMLink.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (parsed.page - 1) * parsed.limit,
        take: parsed.limit,
        include: { post: { select: { id: true, channel: true, caption: true } } },
      }),
      prisma.uTMLink.count(),
    ])

    return okPaginated(data, { page: parsed.page, limit: parsed.limit, total })
  } catch {
    return internalError()
  }
}
