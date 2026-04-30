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
import { hashContactInfo, parseContactInfo } from '@/lib/leads/contact-hash'
import { buildSearchWhere } from '@/lib/search/text-search'
import { NextResponse } from 'next/server'
import { sendLeadCapturedEmail } from '@/lib/notifications/lead-captured.email'
import { trackServerEvent } from '@/lib/ga4-measurement-protocol'
import { GA4_EVENTS } from '@/constants/ga4-events'

// GET /api/v1/leads
export async function GET(request: NextRequest) {
  const { user, response } = await requireSession()
  if (response) return response

  const { searchParams } = new URL(request.url)
  // RESOLVED: G007 — safeParse para retornar 422 em vez de 500 para parâmetros inválidos
  const listResult = ListLeadsSchema.safeParse({
    page: searchParams.get('page') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
    channel: searchParams.get('channel') ?? undefined,
    funnelStage: searchParams.get('funnelStage') ?? undefined,
    themeId: searchParams.get('themeId') ?? undefined,
    includeContact: searchParams.get('includeContact') ?? undefined,
    search: searchParams.get('search') ?? undefined,
  })
  if (!listResult.success) return validationError(listResult.error)
  const parsed = listResult.data

  try {
    const searchWhere = buildSearchWhere(parsed.search ?? null, ['name', 'company'])
    const filters: Record<string, unknown> = {
      ...(parsed.channel ? { channel: parsed.channel } : {}),
      ...(parsed.funnelStage ? { funnelStage: parsed.funnelStage } : {}),
      ...(parsed.themeId ? { firstTouchThemeId: parsed.themeId } : {}),
    }
    const where = searchWhere
      ? { AND: [filters, searchWhere] }
      : filters

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

  // Resolver firstTouchPostId/ThemeId: preserva valores explícitos, infere apenas o que falta
  let resolvedPostId = parsed.data.firstTouchPostId
  let resolvedThemeId = parsed.data.firstTouchThemeId

  if (!resolvedPostId || !resolvedThemeId) {
    const defaultTheme = await prisma.theme.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    })
    if (!defaultTheme) {
      return validationError(new Error('Crie um tema antes de registrar leads'))
    }
    if (!resolvedThemeId) resolvedThemeId = defaultTheme.id

    if (!resolvedPostId) {
      const defaultPost = await prisma.post.findFirst({
        where: { themeId: defaultTheme.id },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      })
      if (!defaultPost) {
        return validationError(new Error('Crie uma publicação antes de registrar leads'))
      }
      resolvedPostId = defaultPost.id
    }
  }

  if (resolvedPostId && parsed.data.firstTouchPostId === resolvedPostId) {
    // Verificar post fornecido explicitamente existe (SEC-007)
    const post = await prisma.post.findUnique({ where: { id: resolvedPostId } })
    if (!post) {
      return validationError(new Error('Post de first-touch não encontrado'))
    }
  }

  try {
    // Criptografar contactInfo antes de persistir (COMP-002)
    let encryptedContact: string | null = null
    let contactHash: string | null = null
    if (parsed.data.contactInfo) {
      try {
        encryptedContact = encryptPII(parsed.data.contactInfo)
      } catch {
        return internalError('Erro ao criptografar dados do lead')
      }
      // TASK-3 ST003 (CL-TA-042): anti-duplicata via hash deterministico
      const contactParts = parseContactInfo(parsed.data.contactInfo)
      contactHash = hashContactInfo(contactParts)
      const existing = await prisma.lead.findUnique({
        where: { contactHash },
        select: { id: true },
      })
      if (existing) {
        return NextResponse.json(
          { error: 'DUPLICATE', existingLeadId: existing.id },
          { status: 409 },
        )
      }
    }

    const lead = await prisma.lead.create({
      data: {
        firstTouchPostId: resolvedPostId!,
        firstTouchThemeId: resolvedThemeId!,
        name: parsed.data.name,
        company: parsed.data.company ?? null,
        contactInfo: encryptedContact,  // AES-256 encrypted — COMP-002
        contactHash,                    // TASK-3 ST003
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

    // PA-04: incrementar UTMLink.clicks apenas quando postId veio explícito no payload
    // (não quando foi resolvido por fallback) — evita inflate de métricas
    if (parsed.data.firstTouchPostId) {
      void prisma.uTMLink.updateMany({
        where: { postId: resolvedPostId! },
        data: { clicks: { increment: 1 } },
      }).catch(() => void 0)
    }

    // TASK-9/ST002 F-026: email assíncrono sem PII (SEC-008)
    void sendLeadCapturedEmail({
      leadSource: lead.channel ?? null,
      utmCampaign: null,
      capturedAt: lead.firstTouchAt ?? new Date(),
    }).catch(() => void 0)

    // MS13-B006: GA4 Measurement Protocol server-side. SEC-008: sem PII (apenas channel, funnelStage, themeId).
    void trackServerEvent({
      name: GA4_EVENTS.LEAD_CREATED,
      params: {
        channel: lead.channel ?? 'unknown',
        funnel_stage: lead.funnelStage ?? 'unknown',
        theme_id: lead.firstTouchThemeId ?? '',
      },
    }).catch(() => void 0)

    // Retornar lead sem contactInfo descriptografado
    return ok({ ...lead, contactInfo: lead.contactInfo ? '●●●●●●' : null }, 201)
  } catch {
    return internalError()
  }
}
