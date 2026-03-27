/**
 * Tipos de jobs Redis para fila de scraping — module-6
 * Rastreabilidade: TASK-0 ST002, CX-06
 */

import type { ScrapingJob, ScrapingJobResult } from './scraping.types'

export type { ScrapingJob, ScrapingJobResult }

export interface QueueJobPayload {
  jobId: string
  type: 'scraping'
  data: ScrapingJob
  enqueuedAt: string
}

export interface QueueJobStatus {
  batchId: string
  status: 'queued' | 'processing' | 'done' | 'failed'
  updatedAt: string
  result?: ScrapingJobResult
  error?: string
}
