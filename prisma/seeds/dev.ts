/**
 * Seed de Desenvolvimento — Inbound Forge
 * Criado por: auto-flow execute (module-1/TASK-2/ST002)
 *
 * Volume realista para desenvolvimento local.
 * Idempotente via upsert.
 */
import type { PrismaClient } from '@prisma/client'
import { upsertOperator, checkSeedAlreadyRun, markSeedComplete } from './helpers'
import { seedScraping } from './scraping.seed'
import { seedPosts } from './posts.seed'
import { seedBlog } from './blog.seed'
import { seedLeads } from './leads.seed'
import { seedAssets } from './assets.seed'

export async function seedDev(prisma: PrismaClient) {
  console.log('🌱 [DEV] Iniciando seed de desenvolvimento...')

  // Operator
  const operator = await upsertOperator(prisma, 'pedro@inboundforge.dev')
  console.log(`  ✓ Operator: ${operator.email}`)

  // WorkerHealth (3 workers — um por tipo)
  const workers = await Promise.all([
    prisma.workerHealth.upsert({
      where: { type: 'SCRAPING' },
      update: {},
      create: { type: 'SCRAPING', status: 'IDLE' },
    }),
    prisma.workerHealth.upsert({
      where: { type: 'IMAGE' },
      update: {},
      create: { type: 'IMAGE', status: 'IDLE' },
    }),
    prisma.workerHealth.upsert({
      where: { type: 'PUBLISHING' },
      update: {},
      create: { type: 'PUBLISHING', status: 'IDLE' },
    }),
  ])
  console.log(`  ✓ WorkerHealth: ${workers.length} workers`)

  // PainLibraryEntries (10)
  const pains = await Promise.all([
    prisma.painLibraryEntry.upsert({
      where: { id: 'dev-pain-001' },
      update: {},
      create: {
        id: 'dev-pain-001',
        title: 'Falta de previsibilidade de receita',
        description: 'PMEs sem sistema de inbound sofrem com receita irregular e dependência de indicações',
        sectors: ['consultoria', 'serviços B2B'],
        status: 'VALIDATED',
      },
    }),
    prisma.painLibraryEntry.upsert({
      where: { id: 'dev-pain-002' },
      update: {},
      create: {
        id: 'dev-pain-002',
        title: 'Custo de aquisição de cliente muito alto',
        description: 'CAC elevado por depender exclusivamente de outbound e anúncios pagos',
        sectors: ['SaaS', 'software'],
        status: 'VALIDATED',
      },
    }),
    prisma.painLibraryEntry.upsert({
      where: { id: 'dev-pain-003' },
      update: {},
      create: {
        id: 'dev-pain-003',
        title: 'Autoridade digital inexistente',
        description: 'Empresa sem presença de conteúdo perde leads para concorrentes com blog e LinkedIn ativos',
        sectors: ['agências', 'profissionais liberais'],
        status: 'VALIDATED',
      },
    }),
    prisma.painLibraryEntry.upsert({
      where: { id: 'dev-pain-004' },
      update: {},
      create: {
        id: 'dev-pain-004',
        title: 'Ciclo de vendas longo sem nutrição',
        description: 'Leads não qualificados entram no pipeline sem conteúdo educativo que acelere a decisão',
        sectors: ['tecnologia', 'serviços'],
        status: 'DRAFT',
      },
    }),
    prisma.painLibraryEntry.upsert({
      where: { id: 'dev-pain-005' },
      update: {},
      create: {
        id: 'dev-pain-005',
        title: 'Conteúdo produzido sem estratégia',
        description: 'Posts sem foco em jornada do cliente geram engajamento mas não convertem em leads',
        sectors: ['e-commerce', 'varejo'],
        status: 'VALIDATED',
      },
    }),
    prisma.painLibraryEntry.upsert({
      where: { id: 'dev-pain-006' },
      update: {},
      create: {
        id: 'dev-pain-006',
        title: 'Equipe de marketing sobrecarregada',
        description: 'Pequenas equipes não conseguem manter cadência de publicação sem automação',
        sectors: ['startups', 'scale-ups'],
        status: 'VALIDATED',
      },
    }),
    prisma.painLibraryEntry.upsert({
      where: { id: 'dev-pain-007' },
      update: {},
      create: {
        id: 'dev-pain-007',
        title: 'Sem rastreamento de ROI de conteúdo',
        description: 'Impossível saber qual conteúdo gera leads e receita sem sistema de atribuição',
        sectors: ['marketing', 'agências'],
        status: 'DRAFT',
      },
    }),
    prisma.painLibraryEntry.upsert({
      where: { id: 'dev-pain-008' },
      update: {},
      create: {
        id: 'dev-pain-008',
        title: 'Conteúdo genérico sem nicho definido',
        description: 'Conteúdo amplo demais não ressoa com nenhum segmento específico de cliente ideal',
        sectors: ['consultoria', 'coaching'],
        status: 'VALIDATED',
      },
    }),
    prisma.painLibraryEntry.upsert({
      where: { id: 'dev-pain-009' },
      update: {},
      create: {
        id: 'dev-pain-009',
        title: 'Dependência excessiva de redes sociais',
        description: 'Sem blog próprio, empresa perde audiência a cada mudança de algoritmo',
        sectors: ['todos'],
        status: 'VALIDATED',
      },
    }),
    prisma.painLibraryEntry.upsert({
      where: { id: 'dev-pain-010' },
      update: {},
      create: {
        id: 'dev-pain-010',
        title: 'Objeções de venda não respondidas no conteúdo',
        description: 'Conteúdo não endereça objeções comuns, deixando dúvidas sem resposta antes da reunião',
        sectors: ['serviços B2B', 'SaaS'],
        status: 'VALIDATED',
      },
    }),
  ])
  console.log(`  ✓ PainLibraryEntries: ${pains.length}`)

  // CaseLibraryEntries (5)
  const cases = await Promise.all([
    prisma.caseLibraryEntry.upsert({
      where: { id: 'dev-case-001' },
      update: {},
      create: {
        id: 'dev-case-001',
        name: 'Agência X triplicou leads com blog estratégico',
        sector: 'agências',
        systemType: 'inbound-blog',
        outcome: 'De 10 leads/mês para 30 leads/mês em 6 meses com conteúdo focado em dores do ICP',
        hasQuantifiableResult: true,
        status: 'VALIDATED',
      },
    }),
    prisma.caseLibraryEntry.upsert({
      where: { id: 'dev-case-002' },
      update: {},
      create: {
        id: 'dev-case-002',
        name: 'Consultora B reduziu CAC em 40%',
        sector: 'consultoria',
        systemType: 'inbound-linkedin',
        outcome: 'LinkedIn orgânico como canal principal reduziu dependência de anúncios pagos',
        hasQuantifiableResult: true,
        status: 'VALIDATED',
      },
    }),
    prisma.caseLibraryEntry.upsert({
      where: { id: 'dev-case-003' },
      update: {},
      create: {
        id: 'dev-case-003',
        name: 'SaaS Y construiu autoridade em nicho específico',
        sector: 'SaaS',
        systemType: 'inbound-seo',
        outcome: 'Posição 1 no Google para 5 keywords de nicho gerando 200 visitas orgânicas/dia',
        hasQuantifiableResult: true,
        status: 'VALIDATED',
      },
    }),
    prisma.caseLibraryEntry.upsert({
      where: { id: 'dev-case-004' },
      update: {},
      create: {
        id: 'dev-case-004',
        name: 'Freelancer Z estabeleceu pipeline previsível',
        sector: 'profissionais liberais',
        systemType: 'inbound-instagram',
        outcome: 'Conteúdo semanal no Instagram gerou 3 novos clientes/mês consistentemente',
        hasQuantifiableResult: false,
        status: 'VALIDATED',
      },
    }),
    prisma.caseLibraryEntry.upsert({
      where: { id: 'dev-case-005' },
      update: {},
      create: {
        id: 'dev-case-005',
        name: 'E-commerce W aumentou LTV com conteúdo educativo',
        sector: 'e-commerce',
        systemType: 'inbound-email',
        outcome: 'Newsletter educativa aumentou recompra em 25% em 3 meses',
        hasQuantifiableResult: true,
        status: 'DRAFT',
      },
    }),
  ])
  console.log(`  ✓ CaseLibraryEntries: ${cases.length}`)

  // Themes (5)
  const themes = await Promise.all([
    prisma.theme.upsert({
      where: { id: 'dev-theme-001' },
      update: {},
      create: {
        id: 'dev-theme-001',
        title: 'Como criar um sistema de inbound marketing do zero para PMEs',
        opportunityScore: 8.5,
        status: 'ACTIVE',
        isNew: false,
        painId: 'dev-pain-001',
      },
    }),
    prisma.theme.upsert({
      where: { id: 'dev-theme-002' },
      update: {},
      create: {
        id: 'dev-theme-002',
        title: '5 formas de reduzir seu CAC usando conteúdo orgânico',
        opportunityScore: 7.8,
        status: 'ACTIVE',
        isNew: true,
        painId: 'dev-pain-002',
      },
    }),
    prisma.theme.upsert({
      where: { id: 'dev-theme-003' },
      update: {},
      create: {
        id: 'dev-theme-003',
        title: 'LinkedIn para consultores: do zero à autoridade em 90 dias',
        opportunityScore: 9.1,
        status: 'ACTIVE',
        isNew: true,
        painId: 'dev-pain-003',
      },
    }),
    prisma.theme.upsert({
      where: { id: 'dev-theme-004' },
      update: {},
      create: {
        id: 'dev-theme-004',
        title: 'Por que seu conteúdo não converte (e como corrigir)',
        opportunityScore: 6.5,
        status: 'ACTIVE',
        isNew: false,
        painId: 'dev-pain-005',
      },
    }),
    prisma.theme.upsert({
      where: { id: 'dev-theme-005' },
      update: {},
      create: {
        id: 'dev-theme-005',
        title: 'Automação de conteúdo: guia prático para equipes pequenas',
        opportunityScore: 5.2,
        status: 'DEPRIORITIZED',
        rejectionReason: 'Muito amplo, necessita nicho mais específico',
        isNew: false,
        painId: 'dev-pain-006',
      },
    }),
  ])
  console.log(`  ✓ Themes: ${themes.length}`)

  // ImageTemplates (7)
  const templates = await Promise.all([
    prisma.imageTemplate.upsert({
      where: { id: 'dev-tpl-001' },
      update: {},
      create: {
        id: 'dev-tpl-001',
        imageType: 'CAROUSEL',
        name: 'Carrossel LinkedIn — Azul Corporativo',
        width: 1080,
        height: 1080,
        description: 'Template para carrosséis LinkedIn com paleta azul',
        isActive: true,
      },
    }),
    prisma.imageTemplate.upsert({
      where: { id: 'dev-tpl-002' },
      update: {},
      create: {
        id: 'dev-tpl-002',
        imageType: 'STATIC',
        name: 'Post Instagram — Minimalista Branco',
        width: 1080,
        height: 1080,
        description: 'Post estático Instagram fundo branco, texto centralizado',
        isActive: true,
      },
    }),
    prisma.imageTemplate.upsert({
      where: { id: 'dev-tpl-003' },
      update: {},
      create: {
        id: 'dev-tpl-003',
        imageType: 'STATIC',
        name: 'Banner Blog — Header Wide',
        width: 1200,
        height: 630,
        description: 'Banner para featured image de artigos de blog (OG)',
        isActive: true,
      },
    }),
    prisma.imageTemplate.upsert({
      where: { id: 'dev-tpl-004' },
      update: {},
      create: {
        id: 'dev-tpl-004',
        imageType: 'CAROUSEL',
        name: 'Carrossel Instagram — Dark Mode',
        width: 1080,
        height: 1350,
        description: 'Carrossel Instagram 4:5 fundo escuro',
        isActive: true,
      },
    }),
    prisma.imageTemplate.upsert({
      where: { id: 'dev-tpl-005' },
      update: {},
      create: {
        id: 'dev-tpl-005',
        imageType: 'STATIC',
        name: 'Post LinkedIn — Quote Card',
        width: 1200,
        height: 628,
        description: 'Card de citação para LinkedIn com gradiente',
        isActive: true,
      },
    }),
    prisma.imageTemplate.upsert({
      where: { id: 'dev-tpl-006' },
      update: {},
      create: {
        id: 'dev-tpl-006',
        imageType: 'CAROUSEL',
        name: 'Carrossel LinkedIn — Passo a Passo',
        width: 1080,
        height: 1080,
        description: 'Template numerado para tutoriais passo a passo',
        isActive: true,
      },
    }),
    prisma.imageTemplate.upsert({
      where: { id: 'dev-tpl-007' },
      update: {},
      create: {
        id: 'dev-tpl-007',
        imageType: 'STATIC',
        name: 'Post Instagram — Stories Format (Inativo)',
        width: 1080,
        height: 1920,
        description: 'Formato Stories — desabilitado até implementação de módulo 12',
        isActive: false,
      },
    }),
  ])
  console.log(`  ✓ ImageTemplates: ${templates.length}`)

  // SolutionPatterns (3) — GAP-005 fix
  const patterns = await Promise.all([
    prisma.solutionPattern.upsert({
      where: { id: 'dev-pattern-001' },
      update: {},
      create: {
        id: 'dev-pattern-001',
        name: 'Blog educativo com SEO de nicho',
        description: 'Criar artigos longos focados em keywords de nicho do ICP, gerando tráfego orgânico qualificado',
        painId: 'dev-pain-001',
        caseId: 'dev-case-001',
      },
    }),
    prisma.solutionPattern.upsert({
      where: { id: 'dev-pattern-002' },
      update: {},
      create: {
        id: 'dev-pattern-002',
        name: 'LinkedIn orgânico com carrosséis semanais',
        description: 'Publicação semanal de carrosséis educativos no LinkedIn para construir autoridade no setor',
        painId: 'dev-pain-002',
        caseId: 'dev-case-002',
      },
    }),
    prisma.solutionPattern.upsert({
      where: { id: 'dev-pattern-003' },
      update: {},
      create: {
        id: 'dev-pattern-003',
        name: 'Conteúdo anti-objeção pré-venda',
        description: 'Artigos e posts que respondem às objeções mais comuns do ICP antes da reunião comercial',
        painId: 'dev-pain-010',
        caseId: 'dev-case-003',
      },
    }),
  ])
  console.log(`  ✓ SolutionPatterns: ${patterns.length}`)

  // Objections (8) — GAP-005 fix
  const objections = await Promise.all([
    prisma.objection.upsert({ where: { id: 'dev-obj-001' }, update: {}, create: { id: 'dev-obj-001', content: 'Inbound marketing demora muito para dar resultado', type: 'TIMING', status: 'VALIDATED' } }),
    prisma.objection.upsert({ where: { id: 'dev-obj-002' }, update: {}, create: { id: 'dev-obj-002', content: 'Já tentamos fazer conteúdo e não funcionou', type: 'TRUST', status: 'VALIDATED' } }),
    prisma.objection.upsert({ where: { id: 'dev-obj-003' }, update: {}, create: { id: 'dev-obj-003', content: 'Não temos orçamento para marketing de conteúdo', type: 'PRICE', status: 'VALIDATED' } }),
    prisma.objection.upsert({ where: { id: 'dev-obj-004' }, update: {}, create: { id: 'dev-obj-004', content: 'Nossa equipe é muito pequena para manter cadência', type: 'NEED', status: 'VALIDATED' } }),
    prisma.objection.upsert({ where: { id: 'dev-obj-005' }, update: {}, create: { id: 'dev-obj-005', content: 'Nosso setor é muito técnico para conteúdo', type: 'TRUST', status: 'VALIDATED' } }),
    prisma.objection.upsert({ where: { id: 'dev-obj-006' }, update: {}, create: { id: 'dev-obj-006', content: 'Preferimos investir em anúncios pagos que dão resultado imediato', type: 'PRICE', status: 'DRAFT' } }),
    prisma.objection.upsert({ where: { id: 'dev-obj-007' }, update: {}, create: { id: 'dev-obj-007', content: 'Não é o momento certo para investir em inbound', type: 'TIMING', status: 'DRAFT' } }),
    prisma.objection.upsert({ where: { id: 'dev-obj-008' }, update: {}, create: { id: 'dev-obj-008', content: 'Quem decide na empresa não usa LinkedIn/redes sociais', type: 'AUTHORITY', status: 'VALIDATED' } }),
  ])
  console.log(`  ✓ Objections: ${objections.length}`)

  // NicheOpportunities (4) — GAP-005 fix
  const niches = await Promise.all([
    prisma.nicheOpportunity.upsert({ where: { id: 'dev-niche-001' }, update: {}, create: { id: 'dev-niche-001', sector: 'Consultoria de TI', painCategory: 'Previsibilidade de receita', potentialScore: 8.7 } }),
    prisma.nicheOpportunity.upsert({ where: { id: 'dev-niche-002' }, update: {}, create: { id: 'dev-niche-002', sector: 'Agências de marketing digital', painCategory: 'Autoridade digital', potentialScore: 7.5 } }),
    prisma.nicheOpportunity.upsert({ where: { id: 'dev-niche-003' }, update: {}, create: { id: 'dev-niche-003', sector: 'SaaS B2B early-stage', painCategory: 'CAC elevado', potentialScore: 9.2 } }),
    prisma.nicheOpportunity.upsert({ where: { id: 'dev-niche-004' }, update: {}, create: { id: 'dev-niche-004', sector: 'Escritórios de advocacia empresarial', painCategory: 'Ciclo de venda longo', potentialScore: 6.8 } }),
  ])
  console.log(`  ✓ NicheOpportunities: ${niches.length}`)

  // ContentPieces (7) — GAP-005 fix
  const pieces = await Promise.all([
    prisma.contentPiece.upsert({ where: { id: 'dev-piece-001' }, update: {}, create: { id: 'dev-piece-001', themeId: 'dev-theme-001', baseTitle: 'Guia: Como montar um sistema de inbound do zero', painCategory: 'previsibilidade', targetNiche: 'consultores B2B', relatedService: 'mentoria', funnelStage: 'AWARENESS', idealFormat: 'carrossel', recommendedChannel: 'LINKEDIN', ctaDestination: 'WHATSAPP', status: 'APPROVED' } }),
    prisma.contentPiece.upsert({ where: { id: 'dev-piece-002' }, update: {}, create: { id: 'dev-piece-002', themeId: 'dev-theme-001', baseTitle: '5 erros que impedem sua empresa de gerar leads', painCategory: 'conversão', targetNiche: 'PMEs', relatedService: 'consultoria', funnelStage: 'CONSIDERATION', idealFormat: 'post estático', recommendedChannel: 'INSTAGRAM', ctaDestination: 'BLOG', status: 'DRAFT' } }),
    prisma.contentPiece.upsert({ where: { id: 'dev-piece-003' }, update: {}, create: { id: 'dev-piece-003', themeId: 'dev-theme-002', baseTitle: 'Como reduzir seu CAC em 40% com conteúdo orgânico', painCategory: 'CAC', targetNiche: 'SaaS B2B', relatedService: 'inbound', funnelStage: 'DECISION', idealFormat: 'artigo longo', recommendedChannel: 'BLOG', ctaDestination: 'CONTACT_FORM', status: 'REVIEW' } }),
    prisma.contentPiece.upsert({ where: { id: 'dev-piece-004' }, update: {}, create: { id: 'dev-piece-004', themeId: 'dev-theme-003', baseTitle: 'LinkedIn para consultores: 0 a autoridade em 90 dias', painCategory: 'autoridade', targetNiche: 'consultores', relatedService: 'branding', funnelStage: 'AWARENESS', idealFormat: 'carrossel', recommendedChannel: 'LINKEDIN', ctaDestination: 'WHATSAPP', status: 'PUBLISHED' } }),
    prisma.contentPiece.upsert({ where: { id: 'dev-piece-005' }, update: {}, create: { id: 'dev-piece-005', themeId: 'dev-theme-003', baseTitle: 'O post que gerou 15 reuniões em uma semana', painCategory: 'autoridade', targetNiche: 'freelancers', relatedService: 'posicionamento', funnelStage: 'CONSIDERATION', idealFormat: 'texto nativo', recommendedChannel: 'LINKEDIN', ctaDestination: 'WHATSAPP', status: 'APPROVED' } }),
    prisma.contentPiece.upsert({ where: { id: 'dev-piece-006' }, update: {}, create: { id: 'dev-piece-006', themeId: 'dev-theme-004', baseTitle: 'Por que seu conteúdo não converte (diagnóstico)', painCategory: 'conversão', targetNiche: 'agências', relatedService: 'auditoria', funnelStage: 'AWARENESS', idealFormat: 'post estático', recommendedChannel: 'INSTAGRAM', ctaDestination: 'BLOG', status: 'DRAFT' } }),
    prisma.contentPiece.upsert({ where: { id: 'dev-piece-007' }, update: {}, create: { id: 'dev-piece-007', themeId: 'dev-theme-004', baseTitle: 'Checklist: seu conteúdo está pronto para converter?', painCategory: 'conversão', targetNiche: 'PMEs', relatedService: 'consultoria', funnelStage: 'DECISION', idealFormat: 'carrossel', recommendedChannel: 'LINKEDIN', ctaDestination: 'CONTACT_FORM', status: 'REVIEW' } }),
    // ContentStatus: SCHEDULED e FAILED (edge cases)
    prisma.contentPiece.upsert({ where: { id: 'dev-piece-008' }, update: {}, create: { id: 'dev-piece-008', themeId: 'dev-theme-002', baseTitle: 'Série: Inbound para nichos industriais — Parte 1', painCategory: 'nicho', targetNiche: 'indústria', relatedService: 'consultoria', funnelStage: 'AWARENESS', idealFormat: 'carrossel', recommendedChannel: 'LINKEDIN', ctaDestination: 'WHATSAPP', status: 'SCHEDULED' } }),
    prisma.contentPiece.upsert({ where: { id: 'dev-piece-009' }, update: {}, create: { id: 'dev-piece-009', themeId: 'dev-theme-005', baseTitle: 'Automação de conteúdo: guia para equipes pequenas', painCategory: 'automação', targetNiche: 'startups', relatedService: 'automação', funnelStage: 'CONSIDERATION', idealFormat: 'artigo', recommendedChannel: 'BLOG', ctaDestination: 'CONTACT_FORM', status: 'FAILED' } }),
    // ContentStatus: PENDING_ART
    prisma.contentPiece.upsert({ where: { id: 'dev-piece-010' }, update: {}, create: { id: 'dev-piece-010', themeId: 'dev-theme-001', baseTitle: 'Guia Visual: Funil de Inbound em 6 Etapas', painCategory: 'funil', targetNiche: 'PMEs', relatedService: 'inbound', funnelStage: 'AWARENESS', idealFormat: 'infográfico', recommendedChannel: 'INSTAGRAM', ctaDestination: 'BLOG', status: 'PENDING_ART' } }),
  ])
  console.log(`  ✓ ContentPieces: ${pieces.length} (todos os ContentStatus cobertos)`)

  // Theme REJECTED — único valor não coberto anteriormente
  await prisma.theme.upsert({
    where: { id: 'dev-theme-006' },
    update: {},
    create: {
      id: 'dev-theme-006',
      title: 'Marketing de influência para B2B: mito ou realidade?',
      opportunityScore: 3.2,
      status: 'REJECTED',
      rejectionReason: 'Fora do posicionamento: tema de influência não é aderente ao ICP de PMEs B2B que buscam inbound estruturado.',
      rejectedAt: new Date(Date.now() - 7 * 86400000),
      rejectedBy: 'operator',
      isNew: false,
      painId: 'dev-pain-003',
    },
  })
  console.log('  ✓ Theme REJECTED adicionado (dev-theme-006)')

  // CasePain — relacionamentos entre cases e dores
  const casePainLinks = [
    { caseId: 'dev-case-001', painId: 'dev-pain-001' },
    { caseId: 'dev-case-001', painId: 'dev-pain-003' },
    { caseId: 'dev-case-002', painId: 'dev-pain-002' },
    { caseId: 'dev-case-003', painId: 'dev-pain-003' },
    { caseId: 'dev-case-003', painId: 'dev-pain-007' },
    { caseId: 'dev-case-004', painId: 'dev-pain-001' },
    { caseId: 'dev-case-005', painId: 'dev-pain-005' },
  ]
  for (const link of casePainLinks) {
    await prisma.casePain.upsert({
      where: { caseId_painId: link },
      update: {},
      create: link,
    }).catch(() => { /* já existe */ })
  }
  console.log(`  ✓ CasePain links: ${casePainLinks.length}`)

  // ScrapedTexts — amostras com todos os estados
  const operatorForScraped = await prisma.operator.findFirst({ where: { email: 'pedro@inboundforge.dev' } })
  const firstSource = await prisma.source.findFirst({ where: { operatorId: operatorForScraped?.id } })
  if (operatorForScraped && firstSource) {
    const scrapedData = [
      // isProcessed: false, isPainCandidate: false — recém coletado
      { id: 'dev-scraped-001', operatorId: operatorForScraped.id, sourceId: firstSource.id, rawText: 'We are struggling to generate leads without paid ads. Our inbound strategy is non-existent.', url: 'https://news.ycombinator.com/item?id=99001', title: 'Ask HN: How to generate B2B leads organically?', isPainCandidate: false, isProcessed: false, piiRemoved: false },
      // isProcessed: true, isPainCandidate: true — candidato a dor identificada
      { id: 'dev-scraped-002', operatorId: operatorForScraped.id, sourceId: firstSource.id, rawText: null, processedText: 'Empresa sem sistema de inbound depende de indicações. Receita imprevisível.', url: 'https://www.reddit.com/r/smallbusiness/comments/abc123', title: 'Como vocês geram leads sem anúncios?', isPainCandidate: true, isProcessed: true, piiRemoved: true, classificationResult: { label: 'pain_candidate', confidence: 0.87, category: 'previsibilidade_receita' } },
      // isProcessed: true, isPainCandidate: false — descartado
      { id: 'dev-scraped-003', operatorId: operatorForScraped.id, sourceId: firstSource.id, rawText: null, processedText: 'Looking for a good ERP system for manufacturing. Any recommendations?', url: 'https://www.g2.com/categories/erp-systems?page=3', title: 'ERP for Manufacturing - G2 Review', isPainCandidate: false, isProcessed: true, piiRemoved: false, classificationResult: { label: 'not_relevant', confidence: 0.92 } },
      // Com TTL (expiresAt no futuro) — dado temporário conforme COMP-004
      { id: 'dev-scraped-004', operatorId: operatorForScraped.id, sourceId: firstSource.id, rawText: 'Our content team is burned out producing 5 posts a week with no clear ROI.', url: 'https://www.producthunt.com/discussions/content-burnout', title: 'Content team burnout — seeking automation tools', isPainCandidate: true, isProcessed: false, piiRemoved: false, expiresAt: new Date(Date.now() + 30 * 86400000), batchId: 'batch-dev-2026-03-26' },
    ]
    for (const scraped of scrapedData) {
      await prisma.scrapedText.upsert({
        where: { id: scraped.id },
        update: {},
        create: scraped,
      })
    }
    console.log(`  ✓ ScrapedTexts: ${scrapedData.length} (não processado, candidato, descartado, com TTL)`)
  }

  // Scraping Sources (module-6)
  await seedScraping(prisma)

  // Posts, Blog, Leads, Assets (módulos 12-15)
  await seedPosts(prisma)
  await seedBlog(prisma)
  await seedLeads(prisma)
  await seedAssets(prisma)

  await markSeedComplete(prisma, 'development')
  console.log('✅ [DEV] Seed de desenvolvimento concluído!')
}
