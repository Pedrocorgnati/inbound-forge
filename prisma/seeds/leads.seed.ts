/**
 * Seed de Leads, Conversões e Atribuição — Inbound Forge (Dev)
 * Atualizado: 2026-04-07 — Leads de PMEs brasileiras que precisam de software sob medida
 *
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

  // ── Leads — PMEs brasileiras com dores operacionais ──────────────────────
  const leadsData = [
    // AWARENESS — Dono de distribuidora via LinkedIn (viu post sobre WhatsApp comercial)
    {
      id: 'dev-lead-001',
      name: 'Ricardo Mendonça',
      company: 'Mendonça Distribuidora de Alimentos Ltda',
      contactInfo: 'ricardo.mendonca+lead@example.com',
      firstTouchPostId: post1.id,
      firstTouchThemeId: theme1.id,
      channel: 'LINKEDIN' as const,
      funnelStage: 'AWARENESS' as const,
      lgpdConsent: true,
      lgpdConsentAt: past(5),
      firstTouchAt: past(5),
      notes: 'Comentou no post sobre WhatsApp comercial: "Isso é exatamente o que acontece aqui. 3 vendedores no WhatsApp sem controle nenhum." Distribuidora com 15 funcionários, faturamento estimado R$ 2M/ano.',
    },
    // CONSIDERATION — Dona de clínica via Instagram (viu carrossel sobre no-show)
    {
      id: 'dev-lead-002',
      name: 'Dra. Fernanda Azevedo',
      company: 'Clínica Integra Fisioterapia',
      contactInfo: 'fernanda.azevedo+lead@example.com',
      firstTouchPostId: (post2 ?? fallbackPost).id,
      firstTouchThemeId: (theme2 ?? fallbackTheme).id,
      channel: 'INSTAGRAM' as const,
      funnelStage: 'CONSIDERATION' as const,
      lgpdConsent: true,
      lgpdConsentAt: past(12),
      firstTouchAt: past(12),
      notes: 'Mandou DM após ver carrossel sobre 5 sinais. Clínica com 6 fisioterapeutas, 80 atendimentos/dia. No-show de ~30%. Já tentou usar Calendly mas não atende LGPD e não integra com WhatsApp.',
    },
    // DECISION — CTO de startup via Blog (leu artigo sobre custos)
    {
      id: 'dev-lead-003',
      name: 'Thiago Ramos',
      company: 'PayFlow Tecnologia (fintech early-stage)',
      contactInfo: 'thiago.ramos+lead@example.com',
      firstTouchPostId: post1.id,
      firstTouchThemeId: theme1.id,
      channel: 'BLOG' as const,
      funnelStage: 'DECISION' as const,
      lgpdConsent: true,
      lgpdConsentAt: past(18),
      firstTouchAt: past(18),
      notes: 'Leu artigo sobre custos de software, entrou em contato pelo formulário. Precisa de MVP de gestão financeira para PMEs. Tem R$ 50k de budget e prazo de 60 dias para demo com investidores. Reunião de diagnóstico realizada.',
    },
    // AWARENESS — Gestor de construtora via LinkedIn (viu post sobre orçamentos)
    {
      id: 'dev-lead-004',
      name: 'Eng. Marcos Vieira',
      company: 'Vieira Construções e Incorporações',
      contactInfo: 'marcos.vieira+lead@example.com',
      firstTouchPostId: post1.id,
      firstTouchThemeId: theme1.id,
      channel: 'LINKEDIN' as const,
      funnelStage: 'AWARENESS' as const,
      lgpdConsent: true,
      lgpdConsentAt: past(3),
      firstTouchAt: past(3),
      notes: 'Salvou post sobre retrabalho e mandou mensagem: "Fazemos orçamento de obra em Excel, leva 3 dias cada um." Construtora com 5 obras simultâneas, 40 funcionários.',
    },
    // EDGE: Lead anônimo sem identificação
    {
      id: 'dev-lead-005',
      name: null,
      company: null,
      contactInfo: null,
      firstTouchPostId: post1.id,
      firstTouchThemeId: theme1.id,
      channel: 'LINKEDIN' as const,
      funnelStage: 'AWARENESS' as const,
      lgpdConsent: false,
      firstTouchAt: past(2),
      notes: 'Clicou no link UTM do post sobre WhatsApp comercial mas não se identificou. Registrado como touch point anônimo.',
    },
    // EDGE: Lead sem consentimento LGPD (pré-checkbox)
    {
      id: 'dev-lead-006',
      name: 'Dra. Ana Carolina Pires',
      company: 'Pires & Associados Advocacia',
      contactInfo: 'ana.pires+lead@example.com',
      firstTouchPostId: (post2 ?? fallbackPost).id,
      firstTouchThemeId: (theme2 ?? fallbackTheme).id,
      channel: 'INSTAGRAM' as const,
      funnelStage: 'AWARENESS' as const,
      lgpdConsent: false,
      firstTouchAt: past(25),
      notes: 'Escritório de advocacia empresarial com 8 advogados. Interessada em automação de petições. Contato pré-implementação da checkbox LGPD — regularização pendente.',
    },
    // DECISION — Lead com múltiplos touchpoints (assisted)
    {
      id: 'dev-lead-007',
      name: 'Guilherme Santos',
      company: 'FitLife Academias (rede com 3 unidades)',
      contactInfo: 'guilherme.santos+lead@example.com',
      firstTouchPostId: post1.id,
      firstTouchThemeId: theme1.id,
      channel: 'LINKEDIN' as const,
      funnelStage: 'DECISION' as const,
      lgpdConsent: true,
      lgpdConsentAt: past(30),
      firstTouchAt: past(30),
      notes: 'Primeiro contato via LinkedIn (post sobre escalabilidade). Depois viu Instagram (5 sinais), leu blog (build vs buy). Rede de 3 academias com sistema legado que não integra unidades. Proposta de R$ 85k em avaliação.',
    },
    // CONSIDERATION — Dona de e-commerce via Blog
    {
      id: 'dev-lead-008',
      name: 'Camila Ferreira',
      company: 'Dona Camila Moda Feminina',
      contactInfo: 'camila.ferreira+lead@example.com',
      firstTouchPostId: post1.id,
      firstTouchThemeId: theme1.id,
      channel: 'BLOG' as const,
      funnelStage: 'CONSIDERATION' as const,
      lgpdConsent: true,
      lgpdConsentAt: past(8),
      firstTouchAt: past(8),
      notes: 'Leu artigo build vs buy. Vende em Shopify + Mercado Livre + Instagram sem integração. Estoque desatualizado causa cancelamentos. 500 pedidos/mês, faturamento ~R$ 150k/mês.',
    },
  ]

  for (const lead of leadsData) {
    await prisma.lead.upsert({
      where: { id: lead.id },
      update: {},
      create: lead,
    })
  }
  console.log(`  ✓ Leads: ${leadsData.length} (AWARENESS x4, CONSIDERATION x2, DECISION x2, edge: anon, sem LGPD)`)

  // ── Assisted touch (many-to-many Lead ↔ Post) ────────────────────────────
  if (post2) {
    try {
      await prisma.lead.update({
        where: { id: 'dev-lead-007' },
        data: { assistedPosts: { connect: { id: post2.id } } },
      })
    } catch {
      // Ignore se já conectado
    }
  }

  // ── ConversionEvents ─────────────────────────────────────────────────────
  const conversionsData = [
    // CONVERSATION + FIRST_TOUCH — distribuidora
    {
      id: 'dev-conv-001',
      leadId: 'dev-lead-001',
      type: 'CONVERSATION' as const,
      attribution: 'FIRST_TOUCH' as const,
      occurredAt: past(3),
      notes: 'WhatsApp: "Vi seu post sobre gestão comercial no WhatsApp. Quero entender como funcionaria para minha distribuidora." Qualificação rápida: 15 func, R$ 2M fat, 3 vendedores sem CRM.',
    },
    // MEETING + FIRST_TOUCH — clínica
    {
      id: 'dev-conv-002',
      leadId: 'dev-lead-002',
      type: 'MEETING' as const,
      attribution: 'FIRST_TOUCH' as const,
      occurredAt: past(8),
      notes: 'Call de diagnóstico de 40 min. Mapeamos: 6 fisioterapeutas, 80 atend/dia, no-show 30%, agenda manual. Estimativa preliminar: R$ 35-50k. Aguardando aprovação da sócia.',
    },
    // MEETING + FIRST_TOUCH — startup fintech
    {
      id: 'dev-conv-003',
      leadId: 'dev-lead-003',
      type: 'MEETING' as const,
      attribution: 'FIRST_TOUCH' as const,
      occurredAt: past(14),
      notes: 'Reunião de diagnóstico: MVP de gestão financeira para PMEs. Stack definida: Next.js + Supabase. Budget R$ 50k, prazo 60 dias. Metodologia documentation-first é diferencial decisivo para o investidor.',
    },
    // PROPOSAL + FIRST_TOUCH — startup fintech
    {
      id: 'dev-conv-004',
      leadId: 'dev-lead-003',
      type: 'PROPOSAL' as const,
      attribution: 'FIRST_TOUCH' as const,
      occurredAt: past(10),
      notes: 'Proposta de R$ 48.000 (MVP 45 dias + 15 dias buffer). Escopo documentado: 12 telas, integrações Pix/Open Finance, dashboard financeiro. Assinatura pendente.',
    },
    // MEETING + ASSISTED_TOUCH — academia (multi-touchpoint)
    {
      id: 'dev-conv-005',
      leadId: 'dev-lead-007',
      type: 'MEETING' as const,
      attribution: 'ASSISTED_TOUCH' as const,
      occurredAt: past(20),
      notes: 'Diagnóstico presencial na unidade central. Sistema legado (Access 2010) não integra 3 unidades. Proposta será multi-fase: fase 1 gestão de alunos, fase 2 financeiro, fase 3 app mobile.',
    },
    // PROPOSAL + ASSISTED_TOUCH — academia
    {
      id: 'dev-conv-006',
      leadId: 'dev-lead-007',
      type: 'PROPOSAL' as const,
      attribution: 'ASSISTED_TOUCH' as const,
      occurredAt: past(12),
      notes: 'Proposta de R$ 85.000 (3 fases, 4 meses). Fase 1: R$ 35k (gestão alunos + check-in QR + cobrança auto). Proposta em avaliação pela diretoria.',
    },
    // CONVERSATION + FIRST_TOUCH — construtora
    {
      id: 'dev-conv-007',
      leadId: 'dev-lead-004',
      type: 'CONVERSATION' as const,
      attribution: 'FIRST_TOUCH' as const,
      occurredAt: past(1),
      notes: 'WhatsApp: "Fazemos orçamento de obra em Excel, erro de 15-20%. Preciso de sistema." Agendando reunião de diagnóstico para próxima semana.',
    },
  ]

  for (const conv of conversionsData) {
    await prisma.conversionEvent.upsert({
      where: { id: conv.id },
      update: {},
      create: conv,
    })
  }
  console.log(`  ✓ ConversionEvents: ${conversionsData.length} (CONVERSATION x2, MEETING x3, PROPOSAL x2)`)

  // ── ReconciliationItems ──────────────────────────────────────────────────
  const reconciliationData = [
    {
      id: 'dev-recon-001',
      type: 'lead_without_post',
      leadId: 'dev-lead-006',
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
      resolution: 'Post sobre retrabalho atingiu 890 impressões e 47 cliques, mas leads vieram por WhatsApp direto (sem UTM). 2 leads registrados manualmente.',
    },
    {
      id: 'dev-recon-003',
      type: 'lgpd_missing_consent',
      leadId: 'dev-lead-006',
      postId: null,
      weekOf: startOfWeek(1),
      resolved: false,
    },
    {
      id: 'dev-recon-004',
      type: 'utm_click_without_conversion',
      leadId: null,
      postId: post1.id,
      weekOf: startOfWeek(0),
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
  console.log(`  ✓ ReconciliationItems: ${reconciliationData.length}`)

  // ── AuditLogs ────────────────────────────────────────────────────────────
  const auditLogsData = [
    {
      id: 'dev-audit-lead-001',
      action: 'lead.created',
      entityType: 'Lead',
      entityId: 'dev-lead-001',
      userId: 'pedro@corgnati.com',
      leadId: 'dev-lead-001',
      metadata: { source: 'linkedin_comment', theme: 'whatsapp-comercial' },
    },
    {
      id: 'dev-audit-lead-002',
      action: 'lead.contact_revealed',
      entityType: 'Lead',
      entityId: 'dev-lead-001',
      userId: 'pedro@corgnati.com',
      leadId: 'dev-lead-001',
      metadata: { revealedAt: past(4).toISOString() },
    },
    {
      id: 'dev-audit-lead-003',
      action: 'conversion.created',
      entityType: 'ConversionEvent',
      entityId: 'dev-conv-001',
      userId: 'pedro@corgnati.com',
      leadId: 'dev-lead-001',
      metadata: { type: 'CONVERSATION', attribution: 'FIRST_TOUCH' },
    },
    {
      id: 'dev-audit-lead-004',
      action: 'lead.funnel_stage_updated',
      entityType: 'Lead',
      entityId: 'dev-lead-003',
      userId: 'pedro@corgnati.com',
      leadId: 'dev-lead-003',
      metadata: { from: 'CONSIDERATION', to: 'DECISION', reason: 'Proposta enviada — R$ 48k MVP fintech' },
    },
    {
      id: 'dev-audit-lead-005',
      action: 'conversion.created',
      entityType: 'ConversionEvent',
      entityId: 'dev-conv-004',
      userId: 'pedro@corgnati.com',
      leadId: 'dev-lead-003',
      metadata: { type: 'PROPOSAL', value: 'R$ 48.000', attribution: 'FIRST_TOUCH' },
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
