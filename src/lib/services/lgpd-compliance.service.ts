/**
 * LGPD Compliance Service — Inbound Forge
 * TASK-3 ST004 / module-6-scraping-worker
 *
 * Relatórios de conformidade LGPD para scraping.
 * Base legal: Art. 10 LGPD — Interesse Legítimo.
 */
import { prisma } from '@/lib/prisma'

export interface ScrapingAuditReportDto {
  period: { startDate: string; endDate: string }
  totalBatches: number
  totalTextos: number
  textosComPII: number
  rawTextLimpos: number
  taxaDescarte: number
  legalBasis: string
}

export async function getScrapingAuditReport(
  startDate: Date,
  endDate: Date
): Promise<ScrapingAuditReportDto> {
  const [lgpdLogs, textStats] = await Promise.all([
    // Logs LGPD_SCRAPING no período
    prisma.alertLog.findMany({
      where: {
        type: 'LGPD_SCRAPING',
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { id: true, createdAt: true },
    }),
    // Estatísticas de ScrapedTexts
    prisma.scrapedText.aggregate({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      _count: { _all: true },
    }),
  ])

  const totalBatches = lgpdLogs.length

  const totalTextos = textStats._count._all

  const textosComPII = await prisma.scrapedText.count({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      piiRemoved: true,
    },
  })

  const rawTextLimpos = await prisma.scrapedText.count({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      rawText: null,
      isProcessed: true,
    },
  })

  const taxaDescarte = totalTextos > 0
    ? Math.round((rawTextLimpos / totalTextos) * 100)
    : 0

  return {
    period: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    totalBatches,
    totalTextos,
    textosComPII,
    rawTextLimpos,
    taxaDescarte,
    legalBasis: 'Art. 10 LGPD - Interesse Legítimo',
  }
}
