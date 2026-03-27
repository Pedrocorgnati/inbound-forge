/**
 * Seed de Leads, Conversões e Atribuição — Inbound Forge (Dev)
 * Cobre: Lead (todos os FunnelStage, Channel, lgpd variants),
 *        ConversionEvent (todos os ConversionType e AttributionType),
 *        ReconciliationItem, AuditLog
 * Idempotente via upsert por id.
 * LGPD: contactInfo é placeholder fictício — sem PII real.
 */
import type { PrismaClient } from '@prisma/client'

export async function seedLeads(prisma: PrismaClient): Promise<void> {
  const now = new Date()
  const past = (days: number) => new Date(now.getTime() - days * 86400000)
  const startOfWeek = (weeksAgo: number) => {
    const d = new Date(now)
    d.setDate(d.getDate() - d.getDay() - weeksAgo * 7)
    d.setHours(0, 0, 0, 0)
    return d
  }

  // Busca posts para FK first_touch_post_id
  const post1 = await prisma.post.findFirst({ where: { channel: 'LINKEDIN' } })
  const post2 = await prisma.post.findFirst({ where: { channel: 'INSTAGRAM' } })
  const theme1 = await prisma.theme.findFirst({ where: { status: 'ACTIVE' } })
  const theme2 = await prisma.theme.findFirst({ where: { status: 'ACTIVE' }, skip: 1 })

  if (!post1 || !theme1) {
    console.log('[seed:leads] Posts ou Themes insuficientes — execute seedPosts antes')
    return
  }

  const fallbackPost = post1
  const fallbackTheme = theme1

  // ── Leads (todos os FunnelStage + edge cases) ──────────────────────────
  const leadsData = [
    // AWARENESS — chegou via LinkedIn, sem conversão ainda
    {
      id: 'dev-lead-001',
      name: 'Carlos Mendes',
      company: 'Consultoria CM Ltda',
      contactInfo: 'carlos.mendes+lead@example.com',
      firstTouchPostId: post1.id,
      firstTouchThemeId: theme1.id,
      channel: 'LINKEDIN' as const,
      funnelStage: 'AWARENESS' as const,
      lgpdConsent: true,
      lgpdConsentAt: past(7),
      firstTouchAt: past(7),
      notes: 'Comentou no post sobre redução de CAC. Sócio-fundador de consultoria de TI.',
    },
    // CONSIDERATION — chegou via Instagram, em conversa
    {
      id: 'dev-lead-002',
      name: 'Beatriz Oliveira',
      company: 'Agência Criativa XYZ',
      contactInfo: 'beatriz.oliveira+lead@example.com',
      firstTouchPostId: (post2 ?? fallbackPost).id,
      firstTouchThemeId: (theme2 ?? fallbackTheme).id,
      channel: 'INSTAGRAM' as const,
      funnelStage: 'CONSIDERATION' as const,
      lgpdConsent: true,
      lgpdConsentAt: past(14),
      firstTouchAt: past(14),
      notes: 'Mandou DM após ver post sobre autoridade no Instagram. Agência de 3 pessoas.',
    },
    // DECISION — chegou via Blog, próximo de proposta
    {
      id: 'dev-lead-003',
      name: 'Roberto Silva',
      company: 'SaaS Fintech Horizonte',
      contactInfo: 'roberto.silva+lead@example.com',
      firstTouchPostId: post1.id,
      firstTouchThemeId: theme1.id,
      channel: 'BLOG' as const,
      funnelStage: 'DECISION' as const,
      lgpdConsent: true,
      lgpdConsentAt: past(21),
      firstTouchAt: past(21),
      notes: 'Leu artigo sobre CAC, entrou em contato pelo formulário. Avaliando proposta.',
    },
    // EDGE: Lead sem nome nem empresa (anônimo)
    {
      id: 'dev-lead-004',
      name: null,
      company: null,
      contactInfo: null,
      firstTouchPostId: post1.id,
      firstTouchThemeId: theme1.id,
      channel: 'LINKEDIN' as const,
      funnelStage: 'AWARENESS' as const,
      lgpdConsent: false,
      firstTouchAt: past(2),
      notes: 'Lead sem identificação — apenas registrado como touch point',
    },
    // EDGE: Lead sem consentimento LGPD (captado antes da checkbox)
    {
      id: 'dev-lead-005',
      name: 'Ana Tereza Fontes',
      company: 'Coaching Empresarial AT',
      contactInfo: 'ana.tereza+lead@example.com',
      firstTouchPostId: (post2 ?? fallbackPost).id,
      firstTouchThemeId: (theme2 ?? fallbackTheme).id,
      channel: 'INSTAGRAM' as const,
      funnelStage: 'AWARENESS' as const,
      lgpdConsent: false,
      firstTouchAt: past(30),
      notes: 'Lead pré-LGPD — sem consentimento registrado. Verificar regularização.',
    },
    // Lead com múltiplos touchpoints (assisted)
    {
      id: 'dev-lead-006',
      name: 'Márcio Henrique Corrêa',
      company: 'Distribuidora Industrial MC',
      contactInfo: 'marcio.correa+lead@example.com',
      firstTouchPostId: post1.id,
      firstTouchThemeId: theme1.id,
      channel: 'LINKEDIN' as const,
      funnelStage: 'DECISION' as const,
      lgpdConsent: true,
      lgpdConsentAt: past(45),
      firstTouchAt: past(45),
      notes: 'Primeiro contato via LinkedIn (AWARENESS). Depois viu post no Instagram e acessou blog.',
    },
  ]

  for (const lead of leadsData) {
    await prisma.lead.upsert({
      where: { id: lead.id },
      update: {},
      create: lead,
    })
  }
  console.log(`  ✓ Leads: ${leadsData.length} (AWARENESS x3, CONSIDERATION x1, DECISION x2, edge: anon, sem LGPD)`)

  // ── Assisted touch (many-to-many Lead ↔ Post) ────────────────────────────
  // dev-lead-006 foi tocado pelo post2 como assisted touch
  if (post2) {
    try {
      await prisma.lead.update({
        where: { id: 'dev-lead-006' },
        data: { assistedPosts: { connect: { id: post2.id } } },
      })
    } catch {
      // Ignore se já conectado
    }
  }

  // ── ConversionEvents (todos os ConversionType e AttributionType) ─────────
  const conversionsData = [
    // CONVERSATION + FIRST_TOUCH
    {
      id: 'dev-conv-001',
      leadId: 'dev-lead-001',
      type: 'CONVERSATION' as const,
      attribution: 'FIRST_TOUCH' as const,
      occurredAt: past(5),
      notes: 'WhatsApp: perguntou sobre diagnóstico gratuito',
    },
    // MEETING + FIRST_TOUCH
    {
      id: 'dev-conv-002',
      leadId: 'dev-lead-002',
      type: 'MEETING' as const,
      attribution: 'FIRST_TOUCH' as const,
      occurredAt: past(10),
      notes: 'Call de 45 min — alinhamento inicial sobre necessidades da agência',
    },
    // MEETING + ASSISTED_TOUCH
    {
      id: 'dev-conv-003',
      leadId: 'dev-lead-006',
      type: 'MEETING' as const,
      attribution: 'ASSISTED_TOUCH' as const,
      occurredAt: past(30),
      notes: 'Reunião de diagnóstico — chegou pelo Instagram após ver o LinkedIn',
    },
    // PROPOSAL + FIRST_TOUCH
    {
      id: 'dev-conv-004',
      leadId: 'dev-lead-003',
      type: 'PROPOSAL' as const,
      attribution: 'FIRST_TOUCH' as const,
      occurredAt: past(7),
      notes: 'Proposta de R$ 18.000/ano enviada via email',
    },
    // PROPOSAL + ASSISTED_TOUCH
    {
      id: 'dev-conv-005',
      leadId: 'dev-lead-006',
      type: 'PROPOSAL' as const,
      attribution: 'ASSISTED_TOUCH' as const,
      occurredAt: past(15),
      notes: 'Proposta enviada após 3 touchpoints (LinkedIn + Instagram + Blog)',
    },
  ]

  for (const conv of conversionsData) {
    await prisma.conversionEvent.upsert({
      where: { id: conv.id },
      update: {},
      create: conv,
    })
  }
  console.log(`  ✓ ConversionEvents: ${conversionsData.length} (CONVERSATION, MEETING, PROPOSAL × FIRST_TOUCH, ASSISTED_TOUCH)`)

  // ── ReconciliationItems (semanas com discrepâncias) ──────────────────────
  const reconciliationData = [
    {
      id: 'dev-recon-001',
      type: 'lead_without_post',
      leadId: 'dev-lead-005',
      postId: null,
      weekOf: startOfWeek(4),
      resolved: false,
    },
    {
      id: 'dev-recon-002',
      type: 'post_without_lead',
      leadId: null,
      postId: post1.id,
      weekOf: startOfWeek(2),
      resolved: true,
      resolution: 'Verificado: post atingiu 340 pessoas mas sem conversão direta rastreável nessa semana',
    },
    {
      id: 'dev-recon-003',
      type: 'lgpd_missing_consent',
      leadId: 'dev-lead-005',
      postId: null,
      weekOf: startOfWeek(1),
      resolved: false,
    },
  ]

  for (const item of reconciliationData) {
    await prisma.reconciliationItem.upsert({
      where: { id: item.id },
      update: {},
      create: item,
    })
  }
  console.log(`  ✓ ReconciliationItems: ${reconciliationData.length} (resolved e pendentes)`)

  // ── AuditLogs (rastros de ações sobre leads) ─────────────────────────────
  const auditLogsData = [
    {
      id: 'dev-audit-lead-001',
      action: 'lead.created',
      entityType: 'Lead',
      entityId: 'dev-lead-001',
      userId: 'pedro@inboundforge.dev',
      leadId: 'dev-lead-001',
      metadata: { source: 'linkedin_comment', postId: post1.id },
    },
    {
      id: 'dev-audit-lead-002',
      action: 'lead.contact_revealed',
      entityType: 'Lead',
      entityId: 'dev-lead-001',
      userId: 'pedro@inboundforge.dev',
      leadId: 'dev-lead-001',
      metadata: { revealedAt: past(6).toISOString() },
    },
    {
      id: 'dev-audit-lead-003',
      action: 'conversion.created',
      entityType: 'ConversionEvent',
      entityId: 'dev-conv-001',
      userId: 'pedro@inboundforge.dev',
      leadId: 'dev-lead-001',
      metadata: { type: 'CONVERSATION', attribution: 'FIRST_TOUCH' },
    },
    {
      id: 'dev-audit-lead-004',
      action: 'lead.funnel_stage_updated',
      entityType: 'Lead',
      entityId: 'dev-lead-003',
      userId: 'pedro@inboundforge.dev',
      leadId: 'dev-lead-003',
      metadata: { from: 'CONSIDERATION', to: 'DECISION' },
    },
  ]

  for (const log of auditLogsData) {
    await prisma.auditLog.upsert({
      where: { id: log.id },
      update: {},
      create: log,
    })
  }
  console.log(`  ✓ AuditLogs (leads): ${auditLogsData.length}`)
}
