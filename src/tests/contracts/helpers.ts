/**
 * Helpers de test fixtures para testes de contrato CX-01 a CX-07
 * Rastreabilidade: INT-091
 */
import { PrismaClient } from '@prisma/client'
import { ConversionType } from '@/types/enums'

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL,
    },
  },
})

// ─── Fixtures ────────────────────────────────────────────────────────────────

export async function createTestOperator(overrides?: Partial<{ email: string; name: string }>) {
  return prisma.operator.create({
    data: {
      email: overrides?.email ?? `test-${Date.now()}@example.com`,
      name: overrides?.name ?? 'Test Operator',
      passwordHash: 'hash-placeholder',
      onboardingCompleted: true,
    },
  })
}

export async function createTestTheme(overrides?: Partial<{ operatorId: string; name: string }>) {
  const operator = overrides?.operatorId
    ? { id: overrides.operatorId }
    : await createTestOperator()

  return prisma.theme.create({
    data: {
      operatorId: operator.id,
      name: overrides?.name ?? `Theme-${Date.now()}`,
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
      title: `Test Content ${Date.now()}`,
      body: 'Test body',
      channel: 'LINKEDIN',
      angle: 'AUTHORIAL',
      status: 'APPROVED',
    },
  })
}

export async function createTestLead(overrides?: Partial<{ themeId: string; operatorId: string }>) {
  const theme = overrides?.themeId
    ? { id: overrides.themeId }
    : await createTestTheme()

  return prisma.lead.create({
    data: {
      operatorId: theme.operatorId ?? (await createTestOperator()).id,
      themeId: theme.id,
      contactInfoEncrypted: Buffer.from('test-contact-info').toString('base64'),
      contactInfoIv: Buffer.from('test-iv-12345678').toString('base64'),
      lgpdConsent: true,   // COMP-002: obrigatório
      lgpdConsentAt: new Date(),
      funnelStage: 'AWARENESS',
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
  // Update ContentPiece.imageUrl and imageJobId (CX-02)
  await prisma.contentPiece.update({
    where: { id: job.contentPieceId },
    data: { imageJobId: job.id, imageUrl },
  })
  return job
}

export async function failImageJob(jobId: string, reason: string) {
  const job = await prisma.imageJob.update({
    where: { id: jobId },
    data: { status: 'FAILED', errorMessage: reason },
  })
  // On failure: do NOT update imageUrl — keep null
  return job
}

export async function createConversionEvent(args: {
  leadId: string
  themeId: string
  conversionType: ConversionType | string
}) {
  const result = await prisma.conversionEvent.create({
    data: {
      leadId: args.leadId,
      themeId: args.themeId,
      conversionType: args.conversionType as ConversionType,
    },
  })
  // CX-01: update Theme.conversionScore
  const conversions = await prisma.conversionEvent.count({ where: { themeId: args.themeId } })
  await prisma.theme.update({
    where: { id: args.themeId },
    data: { conversionScore: conversions },
  })
  return result
}

export async function createUTMLink(args: {
  postId: string
  source: string
  medium: string
}) {
  const trackingUrl = `https://inbound-forge.app?utm_source=${args.source}&utm_medium=${args.medium}&utm_campaign=inbound-forge&postId=${args.postId}`
  const utmLink = await prisma.uTMLink.create({
    data: {
      postId: args.postId,
      source: args.source,
      medium: args.medium,
      campaign: 'inbound-forge',
      trackingUrl,
    },
  })
  // CX-04: update Post.trackingUrl
  await prisma.post.update({
    where: { id: args.postId },
    data: { trackingUrl },
  })
  return utmLink
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

export async function cleanupTestData() {
  await prisma.$executeRawUnsafe(`
    DELETE FROM conversion_events WHERE lead_id IN (
      SELECT id FROM leads WHERE contact_info_encrypted LIKE '%test-%'
    )
  `).catch(() => {})
  await prisma.$executeRawUnsafe(
    `DELETE FROM leads WHERE contact_info_encrypted LIKE '%test-%' OR lgpd_consent_at IS NOT NULL`
  ).catch(() => {})
  await prisma.$executeRawUnsafe(
    `DELETE FROM utm_links WHERE campaign = 'inbound-forge' AND tracking_url LIKE '%postId=%'`
  ).catch(() => {})
}
