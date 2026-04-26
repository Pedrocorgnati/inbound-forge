/**
 * Rejection Feedback Service — Intake Review TASK-12 ST003 (CL-099).
 *
 * On theme reject: incrementa contador de `negativeSignals` para o SolutionPattern
 * e Pain relacionados. Contadores vivem no Redis (MVP) para evitar schema change;
 * migracao futura pode persistir em tabela dedicada `RejectionFeedback`.
 *
 * Penalidade aplicada em theme-scoring: log-scale, cap -30%.
 */
import { redis } from '@/lib/redis'
import { prisma } from '@/lib/prisma'

const NEG_PATTERN_KEY = (patternId: string) => `rej-feedback:pattern:${patternId}`
const NEG_PAIN_KEY = (painId: string) => `rej-feedback:pain:${painId}`
const TTL_SECONDS = 60 * 60 * 24 * 30 // 30 dias

export interface RejectionFeedbackResult {
  patternId: string | null
  painId: string | null
  patternNegativeSignals: number
  painNegativeSignals: number
}

/**
 * Incrementa contador de sinais negativos a partir do tema rejeitado.
 */
export async function registerRejection(themeId: string): Promise<RejectionFeedbackResult> {
  const theme = await prisma.theme.findUnique({
    where: { id: themeId },
    select: { solutionPatternId: true, painId: true },
  })

  if (!theme) {
    return { patternId: null, painId: null, patternNegativeSignals: 0, painNegativeSignals: 0 }
  }

  let patternCount = 0
  let painCount = 0

  if (theme.solutionPatternId) {
    const key = NEG_PATTERN_KEY(theme.solutionPatternId)
    const pipeline = redis.pipeline()
    pipeline.incr(key)
    pipeline.expire(key, TTL_SECONDS)
    const [c] = (await pipeline.exec()) as [number, unknown]
    patternCount = Number(c ?? 0)
  }

  if (theme.painId) {
    const key = NEG_PAIN_KEY(theme.painId)
    const pipeline = redis.pipeline()
    pipeline.incr(key)
    pipeline.expire(key, TTL_SECONDS)
    const [c] = (await pipeline.exec()) as [number, unknown]
    painCount = Number(c ?? 0)
  }

  return {
    patternId: theme.solutionPatternId,
    painId: theme.painId,
    patternNegativeSignals: patternCount,
    painNegativeSignals: painCount,
  }
}

/**
 * Retorna sinal negativo atual para um pattern (0 se ausente).
 */
export async function getPatternNegativeSignals(patternId: string): Promise<number> {
  const raw = await redis.get(NEG_PATTERN_KEY(patternId)).catch(() => null)
  return Number(raw ?? 0)
}

export async function getPainNegativeSignals(painId: string): Promise<number> {
  const raw = await redis.get(NEG_PAIN_KEY(painId)).catch(() => null)
  return Number(raw ?? 0)
}

/**
 * Penalidade log-scale aplicada ao score.
 * 0 rejeicoes -> 1.0 (sem penalidade)
 * 3 rejeicoes -> ~0.70 (-30%)
 * 10+ rejeicoes -> cap em 0.70 (menor penalidade possivel)
 *
 * Formula: max(0.7, 1 - 0.25 * log10(1 + n))
 */
export function rejectionPenaltyMultiplier(n: number): number {
  if (n <= 0) return 1
  const raw = 1 - 0.25 * Math.log10(1 + n)
  return Math.max(0.7, raw)
}

/**
 * Combina sinais de pattern + pain num unico multiplicador (multiplicativo com cap).
 */
export async function getRejectionMultiplier(opts: {
  solutionPatternId?: string | null
  painId?: string | null
}): Promise<number> {
  const [patternN, painN] = await Promise.all([
    opts.solutionPatternId ? getPatternNegativeSignals(opts.solutionPatternId) : Promise.resolve(0),
    opts.painId ? getPainNegativeSignals(opts.painId) : Promise.resolve(0),
  ])
  const mult = rejectionPenaltyMultiplier(patternN) * rejectionPenaltyMultiplier(painN)
  return Math.max(0.7, mult)
}
