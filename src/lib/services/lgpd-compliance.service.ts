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
  operatorId: string,
  startDate: Date,
  endDate: Date
): Promise<ScrapingAuditReportDto> {
  // loop 05-27 TAREFA-013 (fix REPROVADO multi-tenant): TODAS as metricas sao
  // escopadas por operador. A versao anterior derivava totalBatches de AlertLog
  // (log GLOBAL de sistema, sem operatorId) e agregava ScrapedText sem filtro,
  // vazando dados de todos os operadores. Agora:
  //  - totalBatches = ScrapingAuditLog do operador (join source.operatorId) — cada
  //    log representa um batch/run de scraping, e o modelo tem o vinculo de tenant;
  //  - ScrapedText e filtrado por operatorId (campo nativo do modelo).
  const period = { createdAt: { gte: startDate, lte: endDate } }

  const [totalBatches, textStats] = await Promise.all([
    prisma.scrapingAuditLog.count({
      where: { source: { operatorId }, ...period },
    }),
    prisma.scrapedText.aggregate({
      where: { operatorId, ...period },
      _count: { _all: true },
    }),
  ])

  const totalTextos = textStats._count._all

  const textosComPII = await prisma.scrapedText.count({
    where: {
      operatorId,
      createdAt: { gte: startDate, lte: endDate },
      piiRemoved: true,
    },
  })

  const rawTextLimpos = await prisma.scrapedText.count({
    where: {
      operatorId,
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
