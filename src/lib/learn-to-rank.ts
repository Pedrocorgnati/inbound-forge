/**
 * Learn-to-Rank Threshold Check — INT-075
 * PÓS-MVP: quando enabled=true, ativar cron job Upstash QStash para
 * recalcular rankings de temas semanalmente usando conversion scores.
 *
 * Spec de cron job (pós-MVP):
 * - Endpoint: POST /api/v1/themes/rerank
 * - Schedule QStash: 0 3 * * 1 (toda segunda às 3h UTC)
 * - Comando: POST https://qstash.upstash.io/v2/schedules/api/v1/themes/rerank
 * - Trigger: quando enabled=true após checkLearnToRankThreshold()
 *
 * Exportado para module-15 (/health endpoint).
 */
import { prisma } from '@/lib/prisma'
import { LEARN_TO_RANK_THRESHOLD } from '@/constants/attribution-constants'

export interface LearnToRankStatus {
  enabled: boolean
  postsCount: number
  conversionsCount: number
  threshold: { posts: number; conversions: number }
}

/**
 * Verifica se o threshold de learn-to-rank foi atingido.
 * Usado pelo módulo de saúde (module-15) para expor em /health.
 */
export async function checkLearnToRankThreshold(): Promise<LearnToRankStatus> {
  const [postsCount, conversionsCount] = await Promise.all([
    prisma.post.count({ where: { status: 'PUBLISHED' } }),
    prisma.conversionEvent.count(),
  ])

  const enabled =
    postsCount >= LEARN_TO_RANK_THRESHOLD.posts &&
    conversionsCount >= LEARN_TO_RANK_THRESHOLD.conversions

  return {
    enabled,
    postsCount,
    conversionsCount,
    threshold: { ...LEARN_TO_RANK_THRESHOLD },
  }
}
