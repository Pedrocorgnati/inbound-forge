/**
 * POST /api/workers/scraping/trigger
 * TASK-1 ST004 / module-6-scraping-worker
 *
 * Disparo manual de batch de scraping.
 * AUTH_001: exige JWT via Supabase session (operador autenticado).
 * CX-06: enfileira jobs com batchId único.
 * SEC-008: log sem URLs ou rawText.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { requireSession, ok, validationError } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { REDIS_KEYS } from '@/constants/redis-keys'

const TriggerSchema = z.object({
  sourceIds: z.array(z.string()).optional().default([]),
  batchSize: z.number().int().min(1).max(50).optional(),
})

export async function POST(request: NextRequest) {
  // AUTH_001: exigir sessão ativa
  const { user, response: authError } = await requireSession()
  if (authError) return authError

  // RESOLVED: G007 — safeParse para retornar 422 em vez de 500 para input inválido
  let raw: unknown
  try { raw = await request.json() } catch { return validationError(new Error('Body inválido')) }

  const bodyParsed = TriggerSchema.safeParse(raw)
  if (!bodyParsed.success) return validationError(bodyParsed.error)

  const batchId = randomUUID()
  const { sourceIds } = bodyParsed.data

  // Buscar fontes ativas
  let activeSources: { id: string }[]
  try {
    // TASK-3 CL-030: bypass fontes marcadas como anti-bot blocked
    activeSources = await prisma.source.findMany({
      where: sourceIds.length > 0
        ? { id: { in: sourceIds }, isActive: true, antiBotBlocked: false }
        : { isActive: true, antiBotBlocked: false },
      select: { id: true },
    })
  } catch (err) {
    // SYS_002: DB offline
    console.error(`[Trigger] DB error | batchId=${batchId}`, err instanceof Error ? err.message : 'unknown')
    return NextResponse.json(
      { success: false, code: 'SYS_002', error: 'Serviço temporariamente indisponível.' },
      { status: 503 }
    )
  }

  if (activeSources.length === 0) {
    return ok({ batchId, queued: 0, message: 'Nenhuma fonte ativa encontrada.' })
  }

  // Enfileirar via Redis (CX-06)
  try {
    const job = {
      batchId,
      sourceIds: activeSources.map((s) => s.id),
      triggeredBy: 'manual' as const,
      createdAt: new Date().toISOString(),
    }

    await redis.lpush(REDIS_KEYS.SCRAPING_BATCH(batchId), JSON.stringify(job))

    // SEC-008: log sem URLs
    console.info(`[Trigger] Batch enqueued | batchId=${batchId} | sources=${activeSources.length} | userId=${user!.id}`)

    return ok({ batchId, queued: activeSources.length })
  } catch (err) {
    // SYS_002: Redis offline
    console.error(`[Trigger] Redis error | batchId=${batchId}`, err instanceof Error ? err.message : 'unknown')
    return NextResponse.json(
      { success: false, code: 'SYS_002', error: 'Serviço temporariamente indisponível.' },
      { status: 503 }
    )
  }
}
