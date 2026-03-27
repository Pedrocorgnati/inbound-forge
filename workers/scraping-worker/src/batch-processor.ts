/**
 * Batch Processor — Scraping Worker
 * TASK-2 ST002 / module-6-scraping-worker
 *
 * Processa em batch todos os ScrapedTexts não classificados de um batchId.
 * Rate limiting via p-limit (max 5 concurrent + 200ms delay).
 * SEC-008: sem logs de rawText/processedText.
 */
import pLimit from 'p-limit'
import { Redis } from '@upstash/redis'
import { classifyText } from './classifier'
import { getPrisma } from './db'
import { REDIS_KEYS } from './constants'

const BATCH_CONCURRENCY = 5
const BATCH_DELAY_MS = 200
const RESULT_TTL_SECONDS = 24 * 60 * 60

export interface BatchResult {
  batchId: string
  total: number
  candidates: number
  rejected: number
  errors: number
  completedAt: string
}

function getRedis(): Redis {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })
}

async function writeResultWithRetry(
  redis: Redis,
  batchId: string,
  result: BatchResult,
  maxRetries = 3
): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await redis.set(
        REDIS_KEYS.SCRAPING_RESULT(batchId),
        JSON.stringify(result),
        { ex: RESULT_TTL_SECONDS }
      )
      return
    } catch (err) {
      if (attempt === maxRetries) {
        // Última tentativa falhou — logar para recuperação manual
        const prisma = getPrisma()
        await prisma.alertLog.create({
          data: {
            type: 'REDIS_WRITE_FAILURE',
            severity: 'HIGH',
            message: `Falha ao gravar resultado do batch no Redis | batchId=${batchId}`,
            resolved: false,
          },
        }).catch(() => {})
        // Logar resultado para recuperação manual (sem dados de conteúdo)
        console.error(`[BatchProcessor] Redis write failed | batchId=${batchId} | result=`, JSON.stringify(result))
        throw err
      }
      const delay = attempt * 2000
      await new Promise((r) => setTimeout(r, delay))
    }
  }
}

/**
 * Processa todos os ScrapedTexts não classificados de um batch.
 */
export async function processBatch(batchId: string): Promise<BatchResult> {
  const prisma = getPrisma()
  const redis = getRedis()

  // Buscar apenas textos não processados e com processedText disponível
  const texts = await prisma.scrapedText.findMany({
    where: {
      batchId,
      isProcessed: false,
    },
    select: { id: true, processedText: true, rawText: true },
  })

  if (texts.length === 0) {
    const emptyResult: BatchResult = {
      batchId,
      total: 0,
      candidates: 0,
      rejected: 0,
      errors: 0,
      completedAt: new Date().toISOString(),
    }
    console.info(`[BatchProcessor] Empty batch | batchId=${batchId}`)
    return emptyResult
  }

  console.info(`[BatchProcessor] Starting | batchId=${batchId} | count=${texts.length}`)

  const limit = pLimit(BATCH_CONCURRENCY)
  let candidates = 0
  let rejected = 0
  let errors = 0

  await Promise.all(
    texts.map((item) =>
      limit(async () => {
        // Usar processedText se disponível, senão rawText (COMP-006)
        const textToClassify = item.processedText ?? item.rawText ?? ''

        if (!textToClassify) {
          rejected++
          return
        }

        // Rate limiting delay
        await new Promise((r) => setTimeout(r, BATCH_DELAY_MS))

        try {
          const result = await classifyText(item.id, textToClassify)
          if (result.isPainCandidate) {
            candidates++
          } else {
            rejected++
          }
        } catch (err) {
          errors++
          console.error(
            `[BatchProcessor] Item error | id=${item.id} | batchId=${batchId}`,
            err instanceof Error ? err.message : 'unknown'
          )
        }
      })
    )
  )

  const result: BatchResult = {
    batchId,
    total: texts.length,
    candidates,
    rejected,
    errors,
    completedAt: new Date().toISOString(),
  }

  // Gravar resultado no Redis com retry
  await writeResultWithRetry(redis, batchId, result)

  console.info(
    `[BatchProcessor] Done | batchId=${batchId} | total=${texts.length} | candidates=${candidates} | errors=${errors}`
  )

  return result
}
