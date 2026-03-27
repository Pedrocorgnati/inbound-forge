/**
 * Scraping Test Seed — Fixtures para testes
 * TASK-0 ST004 / module-6-scraping-worker
 *
 * 10 ScrapedText fixtures simulando estado pós-LGPD:
 *   - rawText = null (expirado conforme COMP-006)
 *   - piiRemoved = true
 * 5 isPainCandidate=true com classificationResult, 5 isPainCandidate=false.
 * Idempotente: verifica batchId antes de criar.
 */
import type { PrismaClient } from '@prisma/client'
import { upsertOperator } from './helpers'

const TEST_BATCH_ID = 'test-batch-fixture-001'

const FIXTURE_SOURCES = [
  { name: 'HN Test Source', url: 'https://news.ycombinator.com/ask?test=1' },
  { name: 'Reddit Test Source', url: 'https://www.reddit.com/r/smallbusiness/test' },
]

type Fixture = {
  processedText: string
  isPainCandidate: boolean
  classificationResult: object | null
  sourceIndex: number
  url: string
  title: string
}

const PAIN_FIXTURES: Fixture[] = [
  {
    sourceIndex: 0,
    url: 'https://news.ycombinator.com/item?id=test001',
    title: 'ERP integration breaks every Friday',
    isPainCandidate: true,
    processedText:
      'Our ERP integration breaks every Friday when the accounting batch runs. We lose 2 hours rebuilding the data manually.',
    classificationResult: {
      isPainCandidate: true,
      scores: { isOperationalPain: 0.95, isSolvableWithSoftware: 0.88, involvesIntegration: 0.91, companySize: 0.7, isRecurrent: 0.93 },
      reasoning: 'Recurrent operational pain with clear integration gap.',
      suggestedCategory: 'ERP Integration',
    },
  },
  {
    sourceIndex: 1,
    url: 'https://www.reddit.com/r/smallbusiness/comments/test002',
    title: 'Invoice reconciliation takes 3 days monthly',
    isPainCandidate: true,
    processedText:
      'We spend 3 days each month reconciling invoices between our billing system and the bank. The format is different in every export.',
    classificationResult: {
      isPainCandidate: true,
      scores: { isOperationalPain: 0.92, isSolvableWithSoftware: 0.86, involvesIntegration: 0.75, companySize: 0.6, isRecurrent: 0.95 },
      reasoning: 'Monthly recurring reconciliation — high frequency automation opportunity.',
      suggestedCategory: 'Financial Reconciliation',
    },
  },
  {
    sourceIndex: 0,
    url: 'https://news.ycombinator.com/item?id=test003',
    title: 'Supplier onboarding takes 6 weeks',
    isPainCandidate: true,
    processedText:
      'Onboarding a new supplier takes 6 weeks because we need to manually verify documents in 4 different portals.',
    classificationResult: {
      isPainCandidate: true,
      scores: { isOperationalPain: 0.89, isSolvableWithSoftware: 0.82, involvesIntegration: 0.87, companySize: 0.55, isRecurrent: 0.72 },
      reasoning: 'Multi-system onboarding — ideal for workflow automation.',
      suggestedCategory: 'Supplier Onboarding',
    },
  },
  {
    sourceIndex: 1,
    url: 'https://www.reddit.com/r/smallbusiness/comments/test004',
    title: 'Sales team exports CRM to Excel daily',
    isPainCandidate: true,
    processedText:
      'Our sales team exports CRM data to Excel every morning, edits it manually and re-imports. 90 minutes per rep per day.',
    classificationResult: {
      isPainCandidate: true,
      scores: { isOperationalPain: 0.94, isSolvableWithSoftware: 0.91, involvesIntegration: 0.8, companySize: 0.65, isRecurrent: 0.97 },
      reasoning: 'Daily CRM manual cycle — direct ROI with CRM sync automation.',
      suggestedCategory: 'CRM Automation',
    },
  },
  {
    sourceIndex: 0,
    url: 'https://news.ycombinator.com/item?id=test005',
    title: '14 spreadsheets tracking inventory across 3 warehouses',
    isPainCandidate: true,
    processedText:
      'We have 14 spreadsheets tracking inventory across 3 warehouses. Stock discrepancies happen weekly.',
    classificationResult: {
      isPainCandidate: true,
      scores: { isOperationalPain: 0.87, isSolvableWithSoftware: 0.84, involvesIntegration: 0.61, companySize: 0.5, isRecurrent: 0.88 },
      reasoning: 'Fragmented inventory management — classic WMS integration pain point.',
      suggestedCategory: 'Inventory Management',
    },
  },
]

const NON_PAIN_FIXTURES: Fixture[] = [
  {
    sourceIndex: 1,
    url: 'https://www.reddit.com/r/smallbusiness/comments/test006',
    title: 'Best font for startup landing page',
    isPainCandidate: false,
    processedText: 'Anyone know the best font for a startup landing page?',
    classificationResult: null,
  },
  {
    sourceIndex: 0,
    url: 'https://news.ycombinator.com/item?id=test007',
    title: 'We just hit 1000 users',
    isPainCandidate: false,
    processedText: 'We just hit 1000 users! Thanks for all the support everyone.',
    classificationResult: null,
  },
  {
    sourceIndex: 1,
    url: 'https://www.reddit.com/r/smallbusiness/comments/test008',
    title: 'Looking for co-founder in AI space',
    isPainCandidate: false,
    processedText: 'Looking for co-founder in the AI space, DM me.',
    classificationResult: null,
  },
  {
    sourceIndex: 0,
    url: 'https://news.ycombinator.com/item?id=test009',
    title: 'Show HN: color palettes from photos',
    isPainCandidate: false,
    processedText: 'Show HN: I built a tool to generate color palettes from photos.',
    classificationResult: null,
  },
  {
    sourceIndex: 1,
    url: 'https://www.reddit.com/r/smallbusiness/comments/test010',
    title: 'Team communication tools',
    isPainCandidate: false,
    processedText: 'What is everyone using for team communication these days?',
    classificationResult: null,
  },
]

export async function seedScrapingTest(prisma: PrismaClient) {
  console.log('🌱 [SCRAPING TEST] Iniciando seed de fixtures de teste...')

  // Idempotência: se o batch já existe, pular
  const existing = await prisma.scrapedText.count({ where: { batchId: TEST_BATCH_ID } })
  if (existing >= 10) {
    console.log(`  ⏭ Fixtures já existem (${existing} registros com batchId=${TEST_BATCH_ID}). Pulando.`)
    return { created: 0, skipped: existing, batchId: TEST_BATCH_ID }
  }

  const operator = await upsertOperator(prisma, 'pedro@inboundforge.dev')

  const sources = await Promise.all(
    FIXTURE_SOURCES.map((s) =>
      prisma.source.upsert({
        where: { operatorId_url: { operatorId: operator.id, url: s.url } },
        update: {},
        create: { operatorId: operator.id, name: s.name, url: s.url, isActive: true, isProtected: false },
      })
    )
  )

  const allFixtures = [...PAIN_FIXTURES, ...NON_PAIN_FIXTURES]
  const expiresAt = new Date(Date.now() - 2 * 60 * 60 * 1000) // já expirado há 2h

  await prisma.scrapedText.createMany({
    data: allFixtures.map((f) => ({
      operatorId: operator.id,
      sourceId: sources[f.sourceIndex].id,
      batchId: TEST_BATCH_ID,
      url: f.url,
      title: f.title,
      rawText: null,         // COMP-006: rawText expirado e nulificado
      processedText: f.processedText,
      isPainCandidate: f.isPainCandidate,
      isProcessed: true,
      piiRemoved: true,      // PII removido pelo pipeline LGPD
      classificationResult: f.classificationResult ?? undefined,
      expiresAt,
    })),
    skipDuplicates: true,
  })

  console.log(
    `  ✓ ScrapedText fixtures: ${allFixtures.length} (${PAIN_FIXTURES.length} pain, ${NON_PAIN_FIXTURES.length} non-pain)`
  )
  return { created: allFixtures.length, batchId: TEST_BATCH_ID }
}
