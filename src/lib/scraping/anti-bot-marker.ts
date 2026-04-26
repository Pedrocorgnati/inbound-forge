/**
 * Anti-bot marker — Inbound Forge
 * TASK-3 ST002 / CL-030
 *
 * Aplica o resultado do detector a camada de persistencia. Apos ANTI_BOT_FAILURE_THRESHOLD
 * falhas consecutivas com sinais anti-bot, a fonte e marcada `antiBotBlocked=true` e o
 * worker para de processa-la nas proximas execucoes (bypass).
 *
 * Politica: respeitar o bloqueio observado — nao evadir.
 */
import { prisma } from '@/lib/prisma'
import {
  detectAntiBot,
  ANTI_BOT_FAILURE_THRESHOLD,
  type AntiBotResponseLike,
} from './anti-bot-detector'

export interface RecordScrapeOutcomeInput {
  sourceId: string
  response: AntiBotResponseLike
  succeeded: boolean
}

export interface RecordScrapeOutcomeResult {
  isBlocked: boolean
  newlyMarked: boolean
  consecutiveFailures: number
  reason: string | null
}

/**
 * Chamar apos cada tentativa de scrape para atualizar contadores e, se aplicavel,
 * marcar a fonte como antiBotBlocked.
 */
export async function recordScrapeOutcome(
  input: RecordScrapeOutcomeInput
): Promise<RecordScrapeOutcomeResult> {
  const { sourceId, response, succeeded } = input

  if (succeeded) {
    await prisma.source.update({
      where: { id: sourceId },
      data: { consecutiveFailures: 0 },
    })
    return { isBlocked: false, newlyMarked: false, consecutiveFailures: 0, reason: null }
  }

  const detection = detectAntiBot(response)

  if (!detection.isBlocked) {
    return { isBlocked: false, newlyMarked: false, consecutiveFailures: 0, reason: null }
  }

  const current = await prisma.source.findUnique({
    where: { id: sourceId },
    select: { consecutiveFailures: true, antiBotBlocked: true },
  })
  if (!current) {
    return {
      isBlocked: true,
      newlyMarked: false,
      consecutiveFailures: 0,
      reason: detection.reason,
    }
  }

  const nextCount = current.consecutiveFailures + 1
  const shouldBlock = !current.antiBotBlocked && nextCount >= ANTI_BOT_FAILURE_THRESHOLD

  await prisma.source.update({
    where: { id: sourceId },
    data: {
      consecutiveFailures: nextCount,
      ...(shouldBlock
        ? {
            antiBotBlocked: true,
            antiBotReason: detection.reason ?? 'anti-bot detectado',
            antiBotBlockedAt: new Date(),
          }
        : {}),
    },
  })

  if (shouldBlock) {
    // Log estruturado (SEC-008: sem URL no log)
    console.warn(
      `[anti-bot] Source marked as blocked | sourceId=${sourceId} | reason=${detection.reason} | failures=${nextCount}`
    )
  }

  return {
    isBlocked: true,
    newlyMarked: shouldBlock,
    consecutiveFailures: nextCount,
    reason: detection.reason,
  }
}

/**
 * Reset manual pelo operador via UI (POST /api/sources/:id/reset-protection).
 */
export async function resetAntiBotProtection(
  sourceId: string,
  operatorId: string
): Promise<{ ok: true } | { ok: false; code: 'NOT_FOUND' }> {
  const source = await prisma.source.findFirst({
    where: { id: sourceId, operatorId },
    select: { id: true },
  })
  if (!source) return { ok: false, code: 'NOT_FOUND' }

  await prisma.source.update({
    where: { id: sourceId },
    data: {
      antiBotBlocked: false,
      antiBotReason: null,
      antiBotBlockedAt: null,
      consecutiveFailures: 0,
    },
  })

  return { ok: true }
}
