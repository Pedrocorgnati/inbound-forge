/**
 * Helpers de test fixtures para testes de contrato CX-01 a CX-07
 * Rastreabilidade: INT-091
 */
import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL,
    },
  },
})

// ─── Fixtures ────────────────────────────────────────────────────────────────

export async function createTestOperator(overrides?: Partial<{ email: string }>) {
  return prisma.operator.create({
    data: {
      email: overrides?.email ?? `test-${Date.now()}@example.com`,
      onboardingCompleted: true,
    },
  })
}

export async function createTestTheme(overrides?: Partial<{ title: string }>) {
  return prisma.theme.create({
    data: {
      title: overrides?.title ?? `Theme-${Date.now()}`,
      conversionScore: 0,
    },
  })
}

export async function createTestContent(overrides?: Partial<{ themeId: string }>) {
  const theme = overrides?.themeId
    ? { id: overrides.themeId }
    : await createTestTheme()

  return prisma.contentPiece.create({
    data: {
      themeId: theme.id,
      baseTitle: `Test Content ${Date.now()}`,
      painCategory: 'test-pain',
      targetNiche: 'test-niche',
      relatedService: 'test-service',
      funnelStage: 'AWARENESS',
      idealFormat: 'article',
      recommendedChannel: 'LINKEDIN',
      ctaDestination: 'BLOG',
      status: 'APPROVED',
      selectedAngle: 'AUTHORIAL',
    },
  })
}

export async function createTestPost(overrides?: Partial<{ contentPieceId: string }>) {
  const content = overrides?.contentPieceId
    ? { id: overrides.contentPieceId }
    : await createTestContent()

  return prisma.post.create({
    data: {
      contentPieceId: content.id,
      channel: 'LINKEDIN',
      status: 'DRAFT',
      caption: 'Test caption',
    },
  })
}

export async function createTestLead(overrides?: Partial<{ themeId: string }>) {
  const theme = overrides?.themeId
    ? { id: overrides.themeId }
    : await createTestTheme()

  const post = await createTestPost()

  return prisma.lead.create({
    data: {
      firstTouchPostId: post.id,
      firstTouchThemeId: theme.id,
      lgpdConsent: true,
      lgpdConsentAt: new Date(),
      funnelStage: 'AWARENESS',
    },
  })
}

export async function createImageJob(args: { contentPieceId: string }) {
  return prisma.imageJob.create({
    data: {
      contentPieceId: args.contentPieceId,
      provider: 'IDEOGRAM',
      prompt: 'Test image prompt',
      status: 'PENDING',
    },
  })
}

export async function completeImageJob(jobId: string, imageUrl: string) {
  const job = await prisma.imageJob.update({
    where: { id: jobId },
    data: { status: 'DONE', imageUrl },
  })
  // Update ContentPiece.generatedImageUrl and imageJobId (CX-02)
  if (job.contentPieceId) {
    await prisma.contentPiece.update({
      where: { id: job.contentPieceId },
      data: { imageJobId: job.id, generatedImageUrl: imageUrl },
    })
  }
  return job
}

export async function failImageJob(jobId: string, reason: string) {
  const job = await prisma.imageJob.update({
    where: { id: jobId },
    data: { status: 'FAILED', errorMessage: reason },
  })
  return job
}

export async function createConversionEvent(args: {
  leadId: string
  type?: string
}) {
  const result = await prisma.conversionEvent.create({
    data: {
      leadId: args.leadId,
      type: (args.type as 'CONVERSATION' | 'MEETING' | 'PROPOSAL') ?? 'CONVERSATION',
      occurredAt: new Date(),
    },
  })
  return result
}

export async function createUTMLink(args: {
  postId: string
  source: string
  medium: string
}) {
  const fullUrl = `https://inbound-forge.app?utm_source=${args.source}&utm_medium=${args.medium}&utm_campaign=inbound-forge&postId=${args.postId}`
  const utmLink = await prisma.uTMLink.create({
    data: {
      postId: args.postId,
      source: args.source,
      medium: args.medium,
      campaign: 'inbound-forge',
      content: '',
      fullUrl,
    },
  })
  return utmLink
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

export async function cleanupTestData() {
  await prisma.$executeRawUnsafe(`
    DELETE FROM conversion_events WHERE lead_id IN (
      SELECT id FROM leads WHERE lgpd_consent = true
    )
  `).catch(() => {})
  await prisma.$executeRawUnsafe(
    `DELETE FROM leads WHERE lgpd_consent_at IS NOT NULL`
  ).catch(() => {})
  await prisma.$executeRawUnsafe(
    `DELETE FROM utm_links WHERE campaign = 'inbound-forge'`
  ).catch(() => {})
}
