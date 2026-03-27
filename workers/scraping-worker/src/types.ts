/**
 * Types — Scraping Worker (standalone)
 * TASK-1 / module-6-scraping-worker
 *
 * Versão standalone dos tipos de scraping para uso no worker Railway.
 * Espelha src/lib/types/scraping.types.ts sem dependências Next.js.
 */

export interface ScrapingJob {
  batchId: string
  sourceIds: string[]
  triggeredBy: 'cron' | 'manual'
  createdAt: string
}

export interface ScrapingJobResult {
  batchId: string
  processedCount: number
  candidatesCount: number
  rejectedCount: number
  errors: string[]
  completedAt: string
}
