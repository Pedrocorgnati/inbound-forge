/**
 * Audit Logger LGPD — Scraping Worker
 * TASK-3 ST004 / module-6-scraping-worker
 *
 * Registra eventos de conformidade LGPD em AlertLog.
 * INT-105: log por batch processado.
 * SEC-008: metadata sem PII — apenas IDs, contagens e timestamps.
 */
import { getPrisma } from './db'

export interface ScrapingBatchAuditPayload {
  batchId: string
  processed: number
  piiDetected: number
  rawTextDiscarded: number
  timestamp?: string
}

const MAX_RETRIES = 3

/**
 * Registra auditoria LGPD de um batch de scraping.
 * Retenta 3x com backoff em caso de falha de DB.
 */
export async function logScrapingBatch(payload: ScrapingBatchAuditPayload): Promise<void> {
  const ts = payload.timestamp ?? new Date().toISOString()
  const metadata = {
    batchId: payload.batchId,
    processed: payload.processed,
    piiDetected: payload.piiDetected,
    rawTextDiscarded: payload.rawTextDiscarded,
    timestamp: ts,
    legalBasis: 'Art. 10 LGPD - Interesse Legítimo',
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const prisma = getPrisma()
      await prisma.alertLog.create({
        data: {
          type: 'LGPD_SCRAPING',
          severity: 'INFO',
          message: `Batch de scraping processado — LGPD compliance | batchId=${payload.batchId}`,
          resolved: true,
          resolvedAt: new Date(ts),
        },
      })

      // SEC-008: log apenas metadados sem conteúdo
      console.info(`[AuditLogger] LGPD batch logged | batchId=${payload.batchId} | piiDetected=${payload.piiDetected}`)
      return
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        // DEGRADED: fallback para stderr
        console.error(
          `[AuditLogger] DB unavailable after ${MAX_RETRIES} retries | batchId=${payload.batchId} | metadata=`,
          JSON.stringify({ ...metadata })
        )
        return
      }
      const delay = Math.pow(2, attempt) * 1000
      await new Promise((r) => setTimeout(r, delay))
    }
  }
}
