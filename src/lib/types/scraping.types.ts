/**
 * Tipos TypeScript do domínio de scraping — module-6
 * Rastreabilidade: TASK-0 ST002, INT-052, INT-111
 */

export interface ScrapingJob {
  batchId: string
  sourceIds: string[]
  triggeredBy: 'cron' | 'manual'
  createdAt: string // ISO timestamp
}

export interface ScrapingJobResult {
  batchId: string
  processedCount: number
  candidatesCount: number
  rejectedCount: number
  errors: string[]
  completedAt: string // ISO timestamp
}

export interface ClassificationResult {
  isPainCandidate: boolean
  scores: {
    isOperationalPain: 'sim' | 'não' | 'incerto'
    isSolvableWithSoftware: 'sim' | 'não' | 'incerto'
    involvesIntegration: 'sim' | 'não' | 'incerto'
    companySize: 'micro' | 'pequena' | 'media' | 'grande' | 'nao_identificado'
    isRecurrent: 'recorrente' | 'pontual' | 'nao_identificado'
  }
  reasoning: string // max 200 chars, sem PII
  suggestedCategory: string | null
}

export interface CrawlResult {
  url: string
  title: string | null
  rawText: string
  extractedAt: string // ISO timestamp
}

export type WorkerMode = 'cron' | 'manual'
