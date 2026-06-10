/**
 * Seed Demo - Inbound Forge
 * TASK-16 ST002 (CL-311)
 *
 * Fixtures completas do pipeline: Lead, ConversionEvent, UTMLink, ReconciliationItem,
 * ContentPiece com versions. Todos upsert-based (idempotente).
 *
 * Uso:
 *   npm run db:seed:demo
 * Pré-requisito: seed base rodado (`npx prisma db seed`)
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('[DEMO] Seeding dados de demonstracao - pipeline completo...')

  const now = new Date()
  const past = (days: number) => new Date(now.getTime() - days * 86400000)

  // Operator
  const operator = await prisma.operator.upsert({
    where: { email: 'demo@inbound-forge.app' },
    update: {},
    create: {
      email: 'demo@inbound-forge.app',
    },
  })
  console.log(`  [exists/created] Operator: ${operator.email}`)

  // Theme de referencia
  const demoTheme = await prisma.theme.upsert({
    where: { id: 'demo-theme-001' },
    update: {},
    create: {
      id: 'demo-theme-001',
      title: 'Demo: Como PMEs reduzem custos com automação',
      opportunityScore: 88,
      conversionScore: 85,
      painRelevanceScore: 90,
      caseStrengthScore: 80,
      status: 'ACTIVE',
    },
  })
  console.log(`  [exists/created] Theme: ${demoTheme.title.slice(0, 50)}`)

  // Post de referencia
  const demoPost = await prisma.post.upsert({
    where: { id: 'demo-post-001' },
    update: {},
    create: {
      id: 'demo-post-001',
      channel: 'LINKEDIN',
      caption: 'Demo post para pipeline completo',
      themeId: demoTheme.id,
      status: 'PUBLISHED',
      publishedAt: past(10),
    },
  })
  console.log(`  [exists/created] Post: ${demoPost.id}`)

  // 5 Leads com UTM variados
  const leadsData = [
    { id: 'demo-lead-001', name: 'Ana Lima', company: 'Lima Consultoria', source: 'linkedin', medium: 'social', campaign: 'automacao-pme' },
    { id: 'demo-lead-002', name: 'Carlos Souza', company: 'Souza Distribuidora', source: 'instagram', medium: 'social', campaign: 'reducao-custos' },
    { id: 'demo-lead-003', name: 'Beatriz Costa', company: 'Costa Clínica', source: 'email', medium: 'email', campaign: 'newsletter-maio' },
    { id: 'demo-lead-004', name: 'Diego Alves', company: 'Alves Tech', source: 'google', medium: 'organic', campaign: undefined },
    { id: 'demo-lead-005', name: 'Elaine Ramos', company: 'Ramos Advocacia', source: 'linkedin', medium: 'social', campaign: 'caso-advocacia' },
  ]

  for (const lead of leadsData) {
    await prisma.lead.upsert({
      where: { id: lead.id },
      update: {},
      create: {
        id: lead.id,
        name: lead.name,
        company: lead.company,
        contactInfo: `${lead.id}@example-demo.com`,
        channel: lead.source === 'instagram' ? 'INSTAGRAM' : 'LINKEDIN',
        funnelStage: 'AWARENESS',
        firstTouchPostId: demoPost.id,
        firstTouchThemeId: demoTheme.id,
        lgpdConsent: true,
        lgpdConsentAt: past(7),
        firstTouchAt: past(7),
        notes: `UTM demo: source=${lead.source}; medium=${lead.medium}; campaign=${lead.campaign ?? 'not_applicable'}`,
      },
    })
    console.log(`    [exists/created] Lead: ${lead.name}`)
  }

  // 3 ConversionEvents linkados a Leads
  const conversionData = [
    { id: 'demo-conv-001', leadId: 'demo-lead-001', type: 'MEETING', value: 5000 },
    { id: 'demo-conv-002', leadId: 'demo-lead-002', type: 'PROPOSAL', value: 12000 },
    { id: 'demo-conv-003', leadId: 'demo-lead-003', type: 'CONVERSATION', value: 30000 },
  ]

  for (const conv of conversionData) {
    await prisma.conversionEvent.upsert({
      where: { id: conv.id },
      update: {},
      create: {
        id: conv.id,
        leadId: conv.leadId,
        type: conv.type as 'MEETING' | 'PROPOSAL' | 'CONVERSATION',
        attribution: 'FIRST_TOUCH',
        amountBrl: conv.value,
        occurredAt: past(3),
      },
    })
    console.log(`    [exists/created] ConversionEvent: ${conv.type} lead=${conv.leadId}`)
  }

  // 2 UTMLinks com visits
  for (const [i, link] of [
    { id: 'demo-utmlink-001', shortId: 'demo-sl1', target: 'https://wa.me/5511999999901', clicks: 47, campaign: 'automacao-pme' },
    { id: 'demo-utmlink-002', shortId: 'demo-sl2', target: 'https://wa.me/5511999999902', clicks: 23, campaign: 'caso-advocacia' },
  ].entries()) {
    await prisma.uTMLink.upsert({
      where: { id: link.id },
      update: { clicks: link.clicks },
      create: {
        id: link.id,
        postId: demoPost.id,
        source: 'demo',
        medium: 'social',
        campaign: link.campaign,
        content: link.shortId,
        fullUrl: link.target,
        clicks: link.clicks,
      },
    })
    console.log(`    [exists/created] UTMLink: ${link.shortId} clicks=${link.clicks}`)
  }

  // 1 ReconciliationItem
  await prisma.reconciliationItem.upsert({
    where: { id: 'demo-recon-001' },
    update: {},
    create: {
      id: 'demo-recon-001',
      postId: demoPost.id,
      type: 'METRIC_DIVERGENCE',
      weekOf: past(7),
      resolved: false,
      resolution: 'Demo: divergência entre GA4 e banco local (lead count)',
    },
  })
  console.log(`  [exists/created] ReconciliationItem`)

  // ContentPiece com 2 versions
  const content = await prisma.contentPiece.upsert({
    where: { id: 'demo-content-001' },
    update: {},
    create: {
      id: 'demo-content-001',
      themeId: demoTheme.id,
      baseTitle: 'Demo: Como PMEs reduzem custos - artigo completo',
      painCategory: 'Custos operacionais',
      targetNiche: 'PMEs',
      relatedService: 'Automação comercial',
      funnelStage: 'CONSIDERATION',
      idealFormat: 'blog-post',
      recommendedChannel: 'BLOG',
      ctaDestination: 'BLOG',
      editedText: '# Demo Content\n\nEste e um artigo de demonstracao do pipeline completo do Inbound Forge.\n\n## Secao 1\n\nConteudo de exemplo para testes de navegacao ponta-a-ponta.',
      status: 'PUBLISHED',
    },
  })
  console.log(`  [exists/created] ContentPiece: ${content.baseTitle.slice(0, 50)}`)

  // 2 versions do content
  for (const [v, body] of [
    [1, 'Versao inicial do artigo demo - rascunho.'],
    [2, 'Versão revisada com mais detalhes sobre ROI e exemplos práticos.'],
  ] as [number, string][]) {
    await prisma.contentPieceVersion.upsert({
      where: { id: `demo-content-v${v}` },
      update: {},
      create: {
        id: `demo-content-v${v}`,
        pieceId: content.id,
        copy: {
          version: v,
          body,
        },
        variantSnapshot: {
          source: 'seed-demo',
        },
        changeSummary: `Versao demo ${v}`,
        createdBy: operator.id,
      },
    })
    console.log(`    [exists/created] ContentVersion v${v}`)
  }

  console.log('\n[DEMO] Seed de demonstracao concluido - pipeline completo navegavel')
}

main()
  .catch((e) => {
    console.error('Seed demo falhou:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
