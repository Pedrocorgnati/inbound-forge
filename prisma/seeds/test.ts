/**
 * Seed de Testes — Fixtures Determinísticas — Inbound Forge
 * Criado por: auto-flow execute (module-1/TASK-2/ST003)
 *
 * IDs fixos para uso em testes automatizados.
 * clearAll() antes de cada execução — não acumula dados.
 */
import type { PrismaClient } from '@prisma/client'
import { clearAll } from './helpers'
import { seedScrapingTest } from './scraping.test.seed'

// ─── UUIDs fixos exportados para uso nos arquivos de teste ───────────────────
export const TEST_IDS = {
  // Auth
  operator: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',

  // Workers
  workerScraping: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  workerImage: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  workerPublishing: 'd4e5f6a7-b8c9-0123-defa-234567890123',

  // Themes
  theme1: 'e5f6a7b8-c9d0-1234-efab-345678901234',
  theme2: 'f6a7b8c9-d0e1-2345-fabc-456789012345',

  // ContentPieces
  contentPiece1: 'a7b8c9d0-e1f2-3456-abcd-567890123456',
  contentPiece2: 'b8c9d0e1-f2a3-4567-bcde-678901234567',
  contentPiece3: 'c9d0e1f2-a3b4-5678-cdef-789012345678',

  // ContentAngleVariants
  angle1: 'd0e1f2a3-b4c5-6789-defa-890123456789',
  angle2: 'e1f2a3b4-c5d6-7890-efab-901234567890',
  angle3: 'f2a3b4c5-d6e7-8901-fabc-012345678901',
  angle4: 'a3b4c5d6-e7f8-9012-abcd-123456789012',

  // Leads
  lead1: 'b4c5d6e7-f8a9-0123-bcde-234567890123',
  lead2: 'c5d6e7f8-a9b0-1234-cdef-345678901234',
  lead3: 'd6e7f8a9-b0c1-2345-defa-456789012345',

  // Posts
  post1: 'e7f8a9b0-c1d2-3456-efab-567890123456',
  post2: 'f8a9b0c1-d2e3-4567-fabc-678901234567',

  // UTMLinks
  utm1: 'a9b0c1d2-e3f4-5678-abcd-789012345678',
  utm2: 'b0c1d2e3-f4a5-6789-bcde-890123456789',

  // ConversionEvents
  conversion1: 'c1d2e3f4-a5b6-7890-cdef-901234567890',
  conversion2: 'd2e3f4a5-b6c7-8901-defa-012345678901',

  // Blog
  blogArticle1: 'e3f4a5b6-c7d8-9012-efab-123456789012',
  blogArticle2: 'f4a5b6c7-d8e9-0123-fabc-234567890123',
  blogArticleVersion1: 'a5b6c7d8-e9f0-1234-abcd-345678901234',
  blogArticleVersion2: 'b6c7d8e9-f0a1-2345-bcde-456789012345',
  blogArticleVersion3: 'c7d8e9f0-a1b2-3456-cdef-567890123456',
  blogArticleVersion4: 'd8e9f0a1-b2c3-4567-defa-678901234567',

  // PainLibraryEntries
  pain1: 'e9f0a1b2-c3d4-5678-efab-789012345678',

  // CaseLibraryEntries
  case1: 'f0a1b2c3-d4e5-6789-fabc-890123456789',
} as const

// ─── Seed Function ───────────────────────────────────────────────────────────

export async function seedTest(prisma: PrismaClient) {
  console.log('🧪 [TEST] Iniciando seed de testes (clearAll + fixtures)...')

  await clearAll(prisma)

  // Auth: Operator
  await prisma.operator.create({
    data: { id: TEST_IDS.operator, email: 'test@example.com' },
  })

  // Workers
  await prisma.workerHealth.createMany({
    data: [
      { id: TEST_IDS.workerScraping, type: 'SCRAPING', status: 'IDLE' },
      { id: TEST_IDS.workerImage, type: 'IMAGE', status: 'IDLE' },
      { id: TEST_IDS.workerPublishing, type: 'PUBLISHING', status: 'IDLE' },
    ],
  })

  // Knowledge Base
  await prisma.painLibraryEntry.create({
    data: {
      id: TEST_IDS.pain1,
      title: 'Test Pain - Falta de autoridade digital',
      description: 'Fixture para testes de conhecimento',
      sectors: ['test-sector'],
      status: 'VALIDATED',
    },
  })

  await prisma.caseLibraryEntry.create({
    data: {
      id: TEST_IDS.case1,
      name: 'Test Case - Agência X',
      sector: 'agências',
      systemType: 'inbound-blog',
      outcome: 'Triplicou leads em 6 meses',
      hasQuantifiableResult: true,
      status: 'VALIDATED',
    },
  })

  // Content: Themes
  await prisma.theme.createMany({
    data: [
      {
        id: TEST_IDS.theme1,
        title: 'Test Theme 1 — Como criar sistema de inbound',
        opportunityScore: 8.5,
        status: 'ACTIVE',
        isNew: false,
        painId: TEST_IDS.pain1,
      },
      {
        id: TEST_IDS.theme2,
        title: 'Test Theme 2 — Reduzir CAC com conteúdo',
        opportunityScore: 7.2,
        status: 'ACTIVE',
        isNew: true,
        painId: TEST_IDS.pain1,
      },
    ],
  })

  // Content: ContentPieces
  await prisma.contentPiece.createMany({
    data: [
      {
        id: TEST_IDS.contentPiece1,
        themeId: TEST_IDS.theme1,
        baseTitle: 'Test Content 1 — LinkedIn post',
        painCategory: 'autoridade',
        targetNiche: 'consultores B2B',
        relatedService: 'mentoria',
        funnelStage: 'AWARENESS',
        idealFormat: 'carrossel',
        recommendedChannel: 'LINKEDIN',
        ctaDestination: 'WHATSAPP',
        status: 'APPROVED',
      },
      {
        id: TEST_IDS.contentPiece2,
        themeId: TEST_IDS.theme1,
        baseTitle: 'Test Content 2 — Instagram post',
        painCategory: 'autoridade',
        targetNiche: 'PMEs',
        relatedService: 'consultoria',
        funnelStage: 'CONSIDERATION',
        idealFormat: 'post estático',
        recommendedChannel: 'INSTAGRAM',
        ctaDestination: 'BLOG',
        status: 'DRAFT',
      },
      {
        id: TEST_IDS.contentPiece3,
        themeId: TEST_IDS.theme2,
        baseTitle: 'Test Content 3 — Blog article',
        painCategory: 'CAC',
        targetNiche: 'SaaS',
        relatedService: 'inbound',
        funnelStage: 'DECISION',
        idealFormat: 'artigo longo',
        recommendedChannel: 'BLOG',
        ctaDestination: 'CONTACT_FORM',
        status: 'REVIEW',
      },
    ],
  })

  // Content: Angles
  await prisma.contentAngleVariant.createMany({
    data: [
      {
        id: TEST_IDS.angle1,
        pieceId: TEST_IDS.contentPiece1,
        angle: 'AGGRESSIVE',
        text: 'Você está perdendo leads toda semana por não ter sistema de inbound.',
        recommendedCTA: 'Descubra como montar seu sistema em 7 dias',
        suggestedChannel: 'LINKEDIN',
        isSelected: true,
      },
      {
        id: TEST_IDS.angle2,
        pieceId: TEST_IDS.contentPiece1,
        angle: 'CONSULTIVE',
        text: 'A maioria das empresas B2B ainda depende exclusivamente de indicações.',
        recommendedCTA: 'Veja como mudar isso com conteúdo estratégico',
        suggestedChannel: 'LINKEDIN',
        isSelected: false,
      },
      {
        id: TEST_IDS.angle3,
        pieceId: TEST_IDS.contentPiece2,
        angle: 'AUTHORIAL',
        text: 'Aprendi da forma difícil: conteúdo sem estratégia não gera cliente.',
        recommendedCTA: 'Clique para ler o artigo completo',
        suggestedChannel: 'INSTAGRAM',
        isSelected: false,
      },
      {
        id: TEST_IDS.angle4,
        pieceId: TEST_IDS.contentPiece3,
        angle: 'CONSULTIVE',
        text: 'Reduzir o CAC não requer mais budget — requer estratégia de conteúdo certa.',
        recommendedCTA: 'Leia o guia completo no blog',
        suggestedChannel: 'BLOG',
        isSelected: true,
      },
    ],
  })

  // Posts
  await prisma.post.createMany({
    data: [
      {
        id: TEST_IDS.post1,
        contentPieceId: TEST_IDS.contentPiece1,
        channel: 'LINKEDIN',
        scheduledAt: new Date('2026-04-01T10:00:00Z'),
        caption: 'Test caption post 1 — LinkedIn',
        hashtags: ['#inbound', '#marketing', '#B2B'],
        cta: 'Saiba mais',
        status: 'APPROVED',
      },
      {
        id: TEST_IDS.post2,
        contentPieceId: TEST_IDS.contentPiece2,
        channel: 'INSTAGRAM',
        scheduledAt: new Date('2026-04-02T14:00:00Z'),
        caption: 'Test caption post 2 — Instagram',
        hashtags: ['#conteudo', '#digital'],
        cta: 'Clique no link da bio',
        status: 'DRAFT',
      },
    ],
  })

  // UTM Links
  await prisma.uTMLink.createMany({
    data: [
      {
        id: TEST_IDS.utm1,
        postId: TEST_IDS.post1,
        source: 'linkedin',
        medium: 'organic',
        campaign: 'inbound-test-q2-2026',
        content: 'carousel-post1',
        fullUrl: 'https://inboundforge.dev/blog/sistema-inbound?utm_source=linkedin&utm_medium=organic',
        clicks: 42,
      },
      {
        id: TEST_IDS.utm2,
        postId: TEST_IDS.post2,
        source: 'instagram',
        medium: 'organic',
        campaign: 'awareness-test-q2-2026',
        content: 'static-post2',
        fullUrl: 'https://inboundforge.dev/?utm_source=instagram&utm_medium=organic',
        clicks: 15,
      },
    ],
  })

  // Leads (nenhum PII real — apenas dados fictícios)
  await prisma.lead.createMany({
    data: [
      {
        id: TEST_IDS.lead1,
        name: 'João Teste',
        company: 'Empresa Fictícia Ltda',
        contactInfo: 'joao.teste@example.com',
        firstTouchPostId: TEST_IDS.post1,
        firstTouchThemeId: TEST_IDS.theme1,
        notes: 'Lead de teste para testes de conversão',
      },
      {
        id: TEST_IDS.lead2,
        name: 'Maria Exemplo',
        company: 'Startup XYZ',
        contactInfo: 'maria.exemplo@example.com',
        firstTouchPostId: TEST_IDS.post1,
        firstTouchThemeId: TEST_IDS.theme1,
      },
      {
        id: TEST_IDS.lead3,
        name: null,
        company: null,
        contactInfo: 'anonimo@example.com',
        firstTouchPostId: TEST_IDS.post2,
        firstTouchThemeId: TEST_IDS.theme2,
      },
    ],
  })

  // Conversion Events
  await prisma.conversionEvent.createMany({
    data: [
      {
        id: TEST_IDS.conversion1,
        leadId: TEST_IDS.lead1,
        type: 'MEETING',
        attribution: 'FIRST_TOUCH',
        occurredAt: new Date('2026-04-05T15:00:00Z'),
        notes: 'Reunião de diagnóstico agendada via LinkedIn',
      },
      {
        id: TEST_IDS.conversion2,
        leadId: TEST_IDS.lead2,
        type: 'CONVERSATION',
        attribution: 'FIRST_TOUCH',
        occurredAt: new Date('2026-04-06T11:00:00Z'),
      },
    ],
  })

  // Blog Articles
  await prisma.blogArticle.createMany({
    data: [
      {
        id: TEST_IDS.blogArticle1,
        contentPieceId: TEST_IDS.contentPiece3,
        slug: 'test-como-reduzir-cac-com-conteudo',
        title: 'Test: Como reduzir seu CAC com conteúdo orgânico',
        excerpt: 'Guia prático para reduzir o custo de aquisição usando inbound marketing',
        body: '<p>Conteúdo de teste para o artigo 1.</p>',
        metaTitle: 'Reduzir CAC com Conteúdo | Inbound Forge',
        metaDescription: 'Aprenda como reduzir seu CAC em 40% usando estratégias de conteúdo orgânico comprovadas.',
        tags: ['CAC', 'inbound', 'conteúdo'],
        status: 'PUBLISHED',
        publishedAt: new Date('2026-04-01T00:00:00Z'),
      },
      {
        id: TEST_IDS.blogArticle2,
        slug: 'test-sistema-inbound-pmes',
        title: 'Test: Sistema de Inbound para PMEs',
        excerpt: 'Como PMEs podem criar um sistema de geração de leads previsível',
        body: '<p>Conteúdo de teste para o artigo 2.</p>',
        metaTitle: 'Inbound para PMEs | Inbound Forge',
        metaDescription: 'Guia completo para PMEs que querem criar um sistema de inbound marketing do zero.',
        tags: ['PME', 'inbound', 'leads'],
        status: 'DRAFT',
      },
    ],
  })

  // Blog Article Versions
  await prisma.blogArticleVersion.createMany({
    data: [
      {
        id: TEST_IDS.blogArticleVersion1,
        articleId: TEST_IDS.blogArticle1,
        title: 'Como criar uma estratégia de inbound marketing eficaz',
        body: '<p>Versão 1 do artigo 1.</p>',
        changeNote: 'Versão inicial',
        versionNumber: 1,
      },
      {
        id: TEST_IDS.blogArticleVersion2,
        articleId: TEST_IDS.blogArticle1,
        title: 'Como criar uma estratégia de inbound marketing eficaz',
        body: '<p>Versão 2 do artigo 1 com melhorias de SEO.</p>',
        changeNote: 'Otimização de SEO',
        versionNumber: 2,
      },
      {
        id: TEST_IDS.blogArticleVersion3,
        articleId: TEST_IDS.blogArticle2,
        title: '5 técnicas de copywriting para B2B',
        body: '<p>Versão 1 do artigo 2.</p>',
        changeNote: 'Versão inicial',
        versionNumber: 1,
      },
      {
        id: TEST_IDS.blogArticleVersion4,
        articleId: TEST_IDS.blogArticle2,
        title: '5 técnicas de copywriting para B2B',
        body: '<p>Versão 2 do artigo 2 — revisado por Pedro.</p>',
        changeNote: 'Revisão editorial',
        versionNumber: 2,
      },
    ],
  })

  // Scraping fixtures (module-6)
  await seedScrapingTest(prisma)

  console.log('✅ [TEST] Fixtures inseridas com sucesso!')
  console.log(`  Operator: ${TEST_IDS.operator}`)
}
