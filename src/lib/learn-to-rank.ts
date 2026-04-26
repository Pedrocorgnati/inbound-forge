/**
 * Learn-to-Rank — Inbound Forge
 * CL-021: Repriorização automática de temas baseada em dados reais de performance.
 * PÓS-MVP: ativado quando thresholds atingidos (50 posts + 10 conversões).
 * Feature flag: ENABLE_LEARN_TO_RANK=true
 *
 * Rastreabilidade: TASK-7 ST004, INT-075
 */
import { prisma } from '@/lib/prisma'
import { LEARN_TO_RANK_THRESHOLD } from '@/constants/attribution-constants'
import { getLearnToRankSettings } from '@/lib/settings/system-settings'

export interface LearnToRankStatus {
  enabled: boolean
  postsCount: number
  conversionsCount: number
  threshold: { posts: number; conversions: number }
}

export interface ThemeRankScore {
  themeId: string
  ctr: number           // cliques / impressões estimadas
  conversionRate: number // leads / posts publicados
  rejectionRatio: number // rejeições / aprovações
  weightedScore: number  // 0.4*ctr + 0.4*conv + 0.2*(1-rejection)
}

/**
 * Verifica se o threshold de learn-to-rank foi atingido.
 * Usado pelo módulo de saúde (module-15) para expor em /health.
 */
export async function checkLearnToRankThreshold(): Promise<LearnToRankStatus> {
  // CL-082: threshold e configuravel via SystemSetting (fallback para constante)
  const [postsCount, conversionsCount, dynamic] = await Promise.all([
    prisma.post.count({ where: { status: 'PUBLISHED' } }),
    prisma.conversionEvent.count(),
    getLearnToRankSettings().catch(() => ({
      minPosts: LEARN_TO_RANK_THRESHOLD.posts,
      minConversions: LEARN_TO_RANK_THRESHOLD.conversions,
    })),
  ])

  const threshold = {
    posts: dynamic.minPosts,
    conversions: dynamic.minConversions,
  }

  const enabled =
    process.env.ENABLE_LEARN_TO_RANK === 'true' &&
    postsCount >= threshold.posts &&
    conversionsCount >= threshold.conversions

  return {
    enabled,
    postsCount,
    conversionsCount,
    threshold,
  }
}

/**
 * Calcula scores de repriorização por tema usando CTR, conversão e engagement.
 * Retorna array vazio quando thresholds não atingidos (degrada para score estático).
 *
 * Pesos: CTR (40%) + conversão (40%) + engagement (20%)
 */
export async function calculateLearnToRankScores(): Promise<ThemeRankScore[]> {
  const status = await checkLearnToRankThreshold()
  if (!status.enabled) return []

  // Buscar dados de performance por tema
  // Nota: Post não possui themeId/clickCount — usar ContentPiece como proxy de publicação
  const [themes, rejections, publishedPieces] = await Promise.all([
    prisma.theme.findMany({ select: { id: true } }),
    prisma.contentRejection.findMany({
      select: { piece: { select: { themeId: true } } },
    }),
    prisma.contentPiece.findMany({
      where: { status: 'PUBLISHED' },
      select: { themeId: true },
    }),
  ])

  // Agregar por tema
  // ConversionEvent e Post não possuem themeId — métricas de clicks/conversão indisponíveis
  const convsByTheme: Record<string, number> = {}
  const clicksByTheme: Record<string, number> = {}
  const postsByTheme = groupCount(publishedPieces.map(p => p.themeId).filter(Boolean) as string[])
  const rejectionsByTheme = groupCount(
    rejections.map(r => r.piece?.themeId).filter(Boolean) as string[],
  )
  const approvalsByTheme = postsByTheme // mesmos dados: peças publicadas = aprovadas

  const totalPosts = Math.max(publishedPieces.length, 1)
  const totalClicks = 1 // sem dados de clicks no schema atual

  const scores: ThemeRankScore[] = themes.map(({ id }) => {
    const themeClicks = clicksByTheme[id] ?? 0
    const themePosts = postsByTheme[id] ?? 0
    const themeConversions = convsByTheme[id] ?? 0
    const themeRejections = rejectionsByTheme[id] ?? 0
    const themeApprovals = approvalsByTheme[id] ?? 0

    // CTR normalizado (impressões estimadas = proporção de posts do tema)
    const estimatedImpressions = Math.max((themePosts / totalPosts) * totalClicks, 1)
    const ctr = Math.min(themeClicks / estimatedImpressions, 1)

    // Taxa de conversão
    const conversionRate = themePosts > 0 ? Math.min(themeConversions / themePosts, 1) : 0

    // Ratio de rejeição (menor = melhor) — invertido para [0,1] onde 1 = zero rejeições
    const totalFeedback = themeRejections + themeApprovals
    const rejectionRatio = totalFeedback > 0 ? themeRejections / totalFeedback : 0
    const engagementScore = 1 - rejectionRatio

    // Score ponderado
    const weightedScore = 0.4 * ctr + 0.4 * conversionRate + 0.2 * engagementScore

    return { themeId: id, ctr, conversionRate, rejectionRatio, weightedScore }
  })

  return scores.sort((a, b) => b.weightedScore - a.weightedScore)
}

/**
 * Aplica multiplicador LTR ao score existente de um tema.
 * Retorna 1.0 (neutro) quando LTR não ativado.
 */
export async function getLTRMultiplier(themeId: string): Promise<number> {
  const status = await checkLearnToRankThreshold()
  if (!status.enabled) return 1.0

  const scores = await calculateLearnToRankScores()
  const score = scores.find(s => s.themeId === themeId)
  if (!score) return 1.0

  // Mapear weightedScore [0,1] para multiplicador [0.7, 1.3]
  return 0.7 + score.weightedScore * 0.6
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function groupCount(ids: string[]): Record<string, number> {
  return ids.reduce<Record<string, number>>((acc, id) => {
    acc[id] = (acc[id] ?? 0) + 1
    return acc
  }, {})
}
