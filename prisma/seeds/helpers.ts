/**
 * Seed Helpers — Inbound Forge
 * Criado por: auto-flow execute (module-1/TASK-2/ST001)
 */
import type { PrismaClient } from '@prisma/client'

// ─── Operator ────────────────────────────────────────────────────────────────

export async function upsertOperator(prisma: PrismaClient, email: string) {
  return prisma.operator.upsert({
    where: { email },
    update: {},
    create: { email },
  })
}

// ─── Clear All (respeita ordem FK) ───────────────────────────────────────────

export async function clearAll(prisma: PrismaClient) {
  // Ordem reversa das FKs
  await prisma.alertLog.deleteMany()
  await prisma.apiUsageLog.deleteMany()
  await prisma.reconciliationItem.deleteMany()
  await prisma.conversionEvent.deleteMany()
  await prisma.uTMLink.deleteMany()
  await prisma.lead.deleteMany()
  await prisma.blogArticleVersion.deleteMany()
  await prisma.blogArticle.deleteMany()
  await prisma.publishingQueue.deleteMany()
  await prisma.post.deleteMany()
  await prisma.contentRejection.deleteMany()
  await prisma.contentAngleVariant.deleteMany()
  await prisma.contentPiece.deleteMany()
  await prisma.imageJob.deleteMany()
  await prisma.imageTemplate.deleteMany()
  await prisma.visualAsset.deleteMany()
  await prisma.workerHealth.deleteMany()
  await prisma.theme.deleteMany()
  await prisma.scrapedText.deleteMany()
  await prisma.nicheOpportunity.deleteMany()
  await prisma.objection.deleteMany()
  await prisma.solutionPattern.deleteMany()
  await prisma.casePain.deleteMany()
  await prisma.painLibraryEntry.deleteMany()
  await prisma.caseLibraryEntry.deleteMany()
  await prisma.operator.deleteMany()
  await prisma.seedMetadata.deleteMany()
}

// ─── Seed Metadata ───────────────────────────────────────────────────────────

export async function checkSeedAlreadyRun(
  prisma: PrismaClient,
  env: string
): Promise<boolean> {
  const record = await prisma.seedMetadata.findUnique({ where: { env } })
  return !!record
}

export async function markSeedComplete(prisma: PrismaClient, env: string) {
  await prisma.seedMetadata.upsert({
    where: { env },
    update: { executedAt: new Date() },
    create: { env },
  })
}
