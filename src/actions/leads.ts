'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/prisma'
import { encryptPII, decryptPII } from '@/lib/crypto'
import { auditLog } from '@/lib/audit'
import { CreateLeadSchema, ListLeadsSchema } from '@/schemas/lead.schema'
import type { CreateLeadInput } from '@/schemas/lead.schema'
import { captureException } from '@/lib/sentry'
import { type ActionResult, actionSuccess, actionError } from '@/lib/action-utils'
import { checkRateLimit } from '@/lib/utils/redis-rate-limiter'

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getOperatorId(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autorizado')
  return user.id
}

async function checkSession(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return !!user
}

// ─── Leads ────────────────────────────────────────────────────────────────────

export async function getLeads(params?: {
  page?: number
  limit?: number
  channel?: 'BLOG' | 'LINKEDIN' | 'INSTAGRAM'
  funnelStage?: 'AWARENESS' | 'CONSIDERATION' | 'DECISION'
  themeId?: string
  includeContact?: boolean
}) {
  if (!(await checkSession())) return { data: [], total: 0, error: 'Não autorizado' }
  try {
    const parsed = ListLeadsSchema.parse({
      page: params?.page ?? 1,
      limit: params?.limit ?? 20,
      channel: params?.channel,
      funnelStage: params?.funnelStage,
      themeId: params?.themeId,
      includeContact: params?.includeContact ?? false,
    })

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
        return { ...lead, contactInfo: decryptPII(lead.contactInfo) }
      }
      return { ...lead, contactInfo: lead.contactInfo ? '●●●●●●' : null }
    })

    return { data, total }
  } catch (err) {
    captureException(err, { action: 'getLeads' })
    return { data: [], total: 0, error: 'Falha ao carregar leads' }
  }
}

export async function getLead(id: string) {
  if (!(await checkSession())) return { error: 'Não autorizado' }
  try {
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        conversionEvents: { orderBy: { occurredAt: 'asc' } },
        firstTouchTheme: { select: { id: true, title: true, conversionScore: true } },
        firstTouchPost: { select: { id: true, channel: true } },
      },
    })
    if (!lead) return { error: 'Lead não encontrado' }

    return { data: { ...lead, contactInfo: lead.contactInfo ? '●●●●●●' : null } }
  } catch (err) {
    captureException(err, { action: 'getLead' })
    return { error: 'Falha ao carregar lead' }
  }
}

export async function createLead(formData: CreateLeadInput): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await getOperatorId()

    // Rate limit: 50 leads/dia por operador (evita abuso e poluição de dados)
    const rl = await checkRateLimit(userId, 'createLead', 50)
    if (!rl.allowed) {
      return actionError('Limite diário de leads atingido. Tente novamente amanhã.')
    }

    const parsed = CreateLeadSchema.parse(formData)

    // Resolver firstTouchPostId/ThemeId
    let resolvedPostId = parsed.firstTouchPostId
    let resolvedThemeId = parsed.firstTouchThemeId
    if (!resolvedPostId || !resolvedThemeId) {
      const defaultTheme = await prisma.theme.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } })
      if (!defaultTheme) return actionError('Crie um tema antes de registrar leads')
      resolvedThemeId = defaultTheme.id
      const defaultPost = await prisma.post.findFirst({ where: { themeId: defaultTheme.id }, orderBy: { createdAt: 'asc' }, select: { id: true } })
      if (!defaultPost) return actionError('Crie uma publicação antes de registrar leads')
      resolvedPostId = defaultPost.id
    } else {
      const post = await prisma.post.findUnique({ where: { id: resolvedPostId } })
      if (!post) return actionError('Post de first-touch não encontrado')
    }

    // Criptografar contactInfo (COMP-002)
    let encryptedContact: string | null = null
    if (parsed.contactInfo) {
      encryptedContact = encryptPII(parsed.contactInfo)
    }

    const lead = await prisma.lead.create({
      data: {
        firstTouchPostId: resolvedPostId,
        firstTouchThemeId: resolvedThemeId,
        name: parsed.name ?? null,
        company: parsed.company ?? null,
        contactInfo: encryptedContact,
        channel: parsed.channel ?? null,
        funnelStage: parsed.funnelStage ?? null,
        lgpdConsent: parsed.lgpdConsent,
        lgpdConsentAt: parsed.lgpdConsentAt ?? (parsed.lgpdConsent ? new Date() : null),
        firstTouchAt: parsed.firstTouchAt ?? new Date(),
        notes: parsed.notes ?? null,
      },
    })

    // Audit log (COMP-001) — sem contactInfo (SEC-008)
    await auditLog({
      action: 'lead.created',
      entityType: 'Lead',
      entityId: lead.id,
      userId,
      leadId: lead.id,
      metadata: {
        channel: lead.channel,
        funnelStage: lead.funnelStage,
        lgpdConsent: lead.lgpdConsent,
        firstTouchThemeId: lead.firstTouchThemeId,
      },
    })

    revalidatePath('/[locale]/leads', 'page')
    revalidateTag('leads')
    return actionSuccess({ id: lead.id }, 'Lead criado com sucesso')
  } catch (err) {
    if (err instanceof Error && err.message === 'Não autorizado') {
      return actionError('Não autorizado')
    }
    captureException(err, { action: 'createLead' })
    return actionError('Falha ao criar lead')
  }
}

export async function deleteLead(id: string) {
  try {
    const userId = await getOperatorId()

    const existing = await prisma.lead.findUnique({ where: { id } })
    if (!existing) return { error: 'Lead não encontrado' }

    // CX-01: delete + recalcular conversionScore atomicamente (SEC-TX-01)
    await prisma.$transaction(async (tx) => {
      await tx.lead.delete({ where: { id } })

      if (existing.firstTouchThemeId) {
        const [leadsCount, conversionsCount] = await Promise.all([
          tx.lead.count({ where: { firstTouchThemeId: existing.firstTouchThemeId! } }),
          tx.conversionEvent.count({
            where: { lead: { firstTouchThemeId: existing.firstTouchThemeId! } },
          }),
        ])
        const score = leadsCount > 0 ? Math.round((conversionsCount / leadsCount) * 100) : 0
        await tx.theme.update({
          where: { id: existing.firstTouchThemeId! },
          data: { conversionScore: score },
        })
      }
    })

    // Audit log fora da transação (COMP-001) — side effect externo
    await auditLog({
      action: 'lead.deleted',
      entityType: 'Lead',
      entityId: id,
      userId,
      metadata: { channel: existing.channel, funnelStage: existing.funnelStage },
    })

    revalidatePath('/[locale]/leads', 'page')
    revalidateTag('leads')
    return actionSuccess(undefined, 'Lead removido com sucesso')
  } catch (err) {
    if (err instanceof Error && err.message === 'Não autorizado') {
      return actionError('Não autorizado')
    }
    captureException(err, { action: 'deleteLead' })
    return actionError('Falha ao remover lead')
  }
}

export async function getConversions() {
  if (!(await checkSession())) return { data: [], total: 0, error: 'Não autorizado' }
  try {
    const conversions = await prisma.conversionEvent.findMany({
      orderBy: { occurredAt: 'desc' },
      take: 100,
      include: {
        lead: { select: { id: true, name: true, company: true, channel: true } },
      },
    })
    return { data: conversions, total: conversions.length }
  } catch (err) {
    captureException(err, { action: 'getConversions' })
    return { data: [], total: 0, error: 'Falha ao carregar conversões' }
  }
}

export async function getAttribution() {
  if (!(await checkSession())) return { data: [], error: 'Não autorizado' }
  try {
    const themes = await prisma.theme.findMany({
      select: {
        id: true,
        title: true,
        conversionScore: true,
        _count: { select: { firstTouchLeads: true } },
      },
      orderBy: { conversionScore: 'desc' },
    })
    return { data: themes }
  } catch (err) {
    captureException(err, { action: 'getAttribution' })
    return { data: [], error: 'Falha ao carregar atribuição' }
  }
}
