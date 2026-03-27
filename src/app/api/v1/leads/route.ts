/**
 * GET  /api/v1/leads — Listar leads com paginação e filtros
 * POST /api/v1/leads — Criar lead com criptografia PII e LGPD
 * COMP-002: contactInfo encrypted before persist
 * COMP-003: lgpdConsent obrigatório true
 * COMP-001: auditLog em criações
 * SEC-007: ownership via session
 * SEC-008: contactInfo nunca em logs
 */
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, okPaginated, validationError, internalError } from '@/lib/api-auth'
import { CreateLeadSchema, ListLeadsSchema } from '@/schemas/lead.schema'
import { encryptPII, decryptPII } from '@/lib/crypto'
import { auditLog } from '@/lib/audit'

// GET /api/v1/leads
export async function GET(request: NextRequest) {
  const { user, response } = await requireSession()
  if (response) return response

  const { searchParams } = new URL(request.url)
  const parsed = ListLeadsSchema.parse({
    page: searchParams.get('page'),
    limit: searchParams.get('limit'),
    channel: searchParams.get('channel'),
    funnelStage: searchParams.get('funnelStage'),
    themeId: searchParams.get('themeId'),
    includeContact: searchParams.get('includeContact'),
  })

  try {
    const where = {
      ...(parsed.channel ? { channel: parsed.channel } : {}),
      ...(parsed.funnelStage ? { funnelStage: parsed.funnelStage } : {}),
      ...(parsed.themeId ? { firstTouchThemeId: parsed.themeId } : {}),
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parsed.page - 1) * parsed.limit,
        take: parsed.limit,
        include: {
          conversionEvents: { orderBy: { occurredAt: 'asc' } },
          firstTouchTheme: { select: { id: true, title: true } },
          firstTouchPost: { select: { id: true, channel: true } },
        },
      }),
      prisma.lead.count({ where }),
    ])

    const data = leads.map((lead) => {
      if (lead.contactInfo && parsed.includeContact) {
        // Audit reveal (COMP-001) — fire and forget
        void auditLog({
          action: 'lead.contact_revealed',
          entityType: 'Lead',
          entityId: lead.id,
          userId: user!.id,
          leadId: lead.id,
          metadata: { channel: lead.channel },
        })
        return { ...lead, contactInfo: decryptPII(lead.contactInfo) }
      }
      return { ...lead, contactInfo: lead.contactInfo ? '●●●●●●' : null }
    })

    return okPaginated(data, { page: parsed.page, limit: parsed.limit, total })
  } catch {
    return internalError()
  }
}

// POST /api/v1/leads
export async function POST(request: NextRequest) {
  const { user, response } = await requireSession()
  if (response) return response

  let body: unknown
  try { body = await request.json() } catch { return validationError(new Error('Body inválido')) }

  const parsed = CreateLeadSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  // Verificar post de first-touch existe (SEC-007)
  const post = await prisma.post.findUnique({ where: { id: parsed.data.firstTouchPostId } })
  if (!post) {
    return validationError(new Error('Post de first-touch não encontrado'))
  }

  try {
    // Criptografar contactInfo antes de persistir (COMP-002)
    let encryptedContact: string | null = null
    if (parsed.data.contactInfo) {
      try {
        encryptedContact = encryptPII(parsed.data.contactInfo)
      } catch {
        return internalError('Erro ao criptografar dados do lead')
      }
    }

    const lead = await prisma.lead.create({
      data: {
        firstTouchPostId: parsed.data.firstTouchPostId,
        firstTouchThemeId: parsed.data.firstTouchThemeId,
        name: parsed.data.name,
        company: parsed.data.company ?? null,
        contactInfo: encryptedContact,  // AES-256 encrypted — COMP-002
        channel: parsed.data.channel ?? null,
        funnelStage: parsed.data.funnelStage ?? null,
        lgpdConsent: parsed.data.lgpdConsent,
        lgpdConsentAt: parsed.data.lgpdConsentAt ?? (parsed.data.lgpdConsent ? new Date() : null),
        firstTouchAt: parsed.data.firstTouchAt ?? new Date(),
        notes: parsed.data.notes ?? null,
      },
    })

    // Audit log (COMP-001) — sem contactInfo (SEC-008)
    await auditLog({
      action: 'lead.created',
      entityType: 'Lead',
      entityId: lead.id,
      userId: user!.id,
      leadId: lead.id,
      metadata: {
        channel: lead.channel,
        funnelStage: lead.funnelStage,
        lgpdConsent: lead.lgpdConsent,
        firstTouchThemeId: lead.firstTouchThemeId,
      },
    })

    // Retornar lead sem contactInfo descriptografado
    return ok({ ...lead, contactInfo: lead.contactInfo ? '●●●●●●' : null }, 201)
  } catch {
    return internalError()
  }
}
