'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/prisma'
import { encryptPII, decryptPII } from '@/lib/crypto'
import { auditLog } from '@/lib/audit'
import { CreateLeadSchema, ListLeadsSchema } from '@/schemas/lead.schema'
import { updateThemeConversionScore } from '@/lib/conversion-score'
import type { CreateLeadInput, ListLeadsInput } from '@/schemas/lead.schema'

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getOperatorId(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autorizado')
  return user.id
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
    console.error('[getLeads]', err)
    return { data: [], total: 0, error: 'Falha ao carregar leads' }
  }
}

export async function getLead(id: string) {
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
    console.error('[getLead]', err)
    return { error: 'Falha ao carregar lead' }
  }
}

export async function createLead(formData: CreateLeadInput) {
  try {
    const userId = await getOperatorId()
    const parsed = CreateLeadSchema.parse(formData)

    // Verificar post de first-touch (SEC-007)
    const post = await prisma.post.findUnique({ where: { id: parsed.firstTouchPostId } })
    if (!post) return { error: 'Post de first-touch não encontrado' }

    // Criptografar contactInfo (COMP-002)
    let encryptedContact: string | null = null
    if (parsed.contactInfo) {
      encryptedContact = encryptPII(parsed.contactInfo)
    }

    const lead = await prisma.lead.create({
      data: {
        firstTouchPostId: parsed.firstTouchPostId,
        firstTouchThemeId: parsed.firstTouchThemeId,
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
    return { data: { ...lead, contactInfo: lead.contactInfo ? '●●●●●●' : null } }
  } catch (err) {
    if (err instanceof Error && err.message === 'Não autorizado') {
      return { error: 'Não autorizado' }
    }
    console.error('[createLead]', err)
    return { error: 'Falha ao criar lead' }
  }
}

export async function deleteLead(id: string) {
  try {
    const userId = await getOperatorId()

    const existing = await prisma.lead.findUnique({ where: { id } })
    if (!existing) return { error: 'Lead não encontrado' }

    await prisma.lead.delete({ where: { id } })

    // Audit log (COMP-001)
    await auditLog({
      action: 'lead.deleted',
      entityType: 'Lead',
      entityId: id,
      userId,
      metadata: { channel: existing.channel, funnelStage: existing.funnelStage },
    })

    // CX-01: Recalcular conversionScore do tema
    if (existing.firstTouchThemeId) {
      await updateThemeConversionScore(existing.firstTouchThemeId)
    }

    revalidatePath('/[locale]/leads', 'page')
    return { success: true }
  } catch (err) {
    if (err instanceof Error && err.message === 'Não autorizado') {
      return { error: 'Não autorizado' }
    }
    console.error('[deleteLead]', err)
    return { error: 'Falha ao remover lead' }
  }
}

export async function getConversions() {
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
    console.error('[getConversions]', err)
    return { data: [], total: 0, error: 'Falha ao carregar conversões' }
  }
}

export async function getAttribution() {
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
    console.error('[getAttribution]', err)
    return { data: [], error: 'Falha ao carregar atribuição' }
  }
}
