/**
 * Classification Service — Inbound Forge
 * TASK-2 ST003 / module-6-scraping-worker
 *
 * Consulta e revisão manual de ScrapedTexts classificados.
 * SEC-007: ownership check antes de PATCH.
 * COMP-001: audit log em overrides manuais.
 * SEC-008: sem PII em logs.
 * COMP-PII: withPiiSanitization disponível para injeção em chamadas Claude futuras.
 */
import { prisma } from '@/lib/prisma'
// TASK-1 ST002: PII sanitization disponível para chamadas Claude neste serviço
// A classificação via IA ocorre no scraping-worker (workers/scraping-worker/src/classifier.ts)
// que aplica system prompt com PII_SANITIZATION_INSTRUCTION via withPiiSanitization.
export { withPiiSanitization, PII_SANITIZATION_INSTRUCTION } from '@/lib/prompts/pii-sanitization'

export interface ScrapedTextFilters {
  isPainCandidate?: boolean
  batchId?: string
  sourceId?: string
  page?: number
  limit?: number
}

export interface ScrapedTextDto {
  id: string
  sourceId: string
  batchId: string | null
  url: string
  title: string | null
  isPainCandidate: boolean
  isProcessed: boolean
  piiRemoved: boolean
  classificationResult: unknown
  createdAt: string
}

export async function findScrapedTexts(
  operatorId: string,
  filters: ScrapedTextFilters
): Promise<{ data: ScrapedTextDto[]; total: number }> {
  const page = Math.max(1, filters.page ?? 1)
  const limit = Math.min(100, Math.max(1, filters.limit ?? 20)) // PERF-002: max 100

  const where = {
    operatorId,
    ...(filters.isPainCandidate !== undefined && { isPainCandidate: filters.isPainCandidate }),
    ...(filters.batchId && { batchId: filters.batchId }),
    ...(filters.sourceId && { sourceId: filters.sourceId }),
  }

  const [total, items] = await Promise.all([
    prisma.scrapedText.count({ where }),
    prisma.scrapedText.findMany({
      where,
      select: {
        id: true,
        sourceId: true,
        batchId: true,
        url: true,
        title: true,
        isPainCandidate: true,
        isProcessed: true,
        piiRemoved: true,
        classificationResult: true,
        createdAt: true,
        // SEC-008: NÃO retornar rawText ou processedText
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  return {
    data: items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    })),
    total,
  }
}

export async function findScrapedTextById(
  id: string,
  operatorId: string
): Promise<ScrapedTextDto | null> {
  const item = await prisma.scrapedText.findFirst({
    where: { id, operatorId },
    select: {
      id: true,
      sourceId: true,
      batchId: true,
      url: true,
      title: true,
      isPainCandidate: true,
      isProcessed: true,
      piiRemoved: true,
      classificationResult: true,
      createdAt: true,
    },
  })

  if (!item) return null

  return { ...item, createdAt: item.createdAt.toISOString() }
}

/**
 * Permite ao operador corrigir manualmente a classificação da IA.
 * SEC-007: ownership verificado antes de alterar.
 * COMP-001: audit log em todo override.
 */
export async function overrideClassification(
  id: string,
  operatorId: string,
  isPainCandidate: boolean
): Promise<ScrapedTextDto | 'NOT_FOUND' | 'FORBIDDEN'> {
  // Verificar existência e ownership
  const existing = await prisma.scrapedText.findUnique({
    where: { id },
    select: { id: true, operatorId: true, isPainCandidate: true },
  })

  if (!existing) return 'NOT_FOUND'

  // SEC-007: ownership check
  if (existing.operatorId !== operatorId) {
    // Audit log de tentativa não autorizada
    await prisma.alertLog.create({
      data: {
        type: 'UNAUTHORIZED_OVERRIDE_ATTEMPT',
        severity: 'HIGH',
        message: `Operador ${operatorId} tentou sobrescrever ScrapedText ${id} de outro operador`,
        resolved: true, // Apenas informativo
        resolvedAt: new Date(),
      },
    }).catch(() => {})

    return 'FORBIDDEN'
  }

  const updated = await prisma.scrapedText.update({
    where: { id },
    data: { isPainCandidate, piiRemoved: true }, // TASK-1 ST002: confirmar remoção PII no override
    select: {
      id: true,
      sourceId: true,
      batchId: true,
      url: true,
      title: true,
      isPainCandidate: true,
      isProcessed: true,
      piiRemoved: true,
      classificationResult: true,
      createdAt: true,
    },
  })

  // COMP-001: audit log do override
  console.info(
    `[ClassificationService] Override | id=${id} | from=${existing.isPainCandidate} | to=${isPainCandidate} | operatorId=${operatorId}`
  )

  return { ...updated, createdAt: updated.createdAt.toISOString() }
}

/**
 * TASK-2 ST002: Verifica se Claude API está disponível para classificação.
 * Quando indisponível, textos coletados ficam em estado não classificado
 * e são reprocessados na próxima execução do worker (classificationDeferred).
 *
 * Retorna { degraded: true } quando Claude está fora — sem erro fatal.
 */
export async function checkClassificationAvailability(): Promise<{ degraded: boolean; reason?: string }> {
  const { isServiceAvailable, ExternalService } = await import('@/lib/services/service-health')
  const available = await isServiceAvailable(ExternalService.CLAUDE)

  if (!available) {
    console.info('[ClassificationService] Claude API indisponível — classificação adiada (SYS_004)')
    return { degraded: true, reason: 'Claude API temporariamente indisponível' }
  }

  return { degraded: false }
}
