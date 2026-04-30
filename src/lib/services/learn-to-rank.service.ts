/**
 * Learn-to-Rank Service — Inbound Forge
 * TASK-3 ST002 / intake-review LTR Engine
 *
 * Motor de repriorizacao automatica de temas baseado em dados reais de conversao.
 * Ativa-se apos LTR_THRESHOLDS.postsRequired posts + LTR_THRESHOLDS.conversionsRequired conversoes.
 * CL-030, CL-071, CL-073, CL-080.
 */
import { prisma } from '@/lib/prisma'
import { LTR_THRESHOLDS } from '@/lib/constants/thresholds'

export interface ThemeScoreUpdate {
  themeId: string
  previousScore: number
  newScore: number
  adjustment: number  // 1.0 = neutro, >1 = boost, <1 = penalidade
  postsCount: number
  conversionsCount: number
}

export interface LtrStatus {
  active: boolean
  postsCount: number
  conversionsCount: number
  thresholds: typeof LTR_THRESHOLDS
  progress: {
    posts: number    // 0-1 percentual
    conversions: number
  }
  lastRecalculation: string | null
}

/**
 * Verifica se o LTR atingiu os thresholds de ativação.
 */
export async function isLtrActive(): Promise<boolean> {
  const [postsCount, conversionsCount] = await Promise.all([
    prisma.post.count({ where: { status: 'PUBLISHED' } }),
    prisma.conversionEvent.count(),
  ])

  return (
    postsCount >= LTR_THRESHOLDS.postsRequired &&
    conversionsCount >= LTR_THRESHOLDS.conversionsRequired
  )
}

/**
 * Retorna status detalhado do LTR para exibição no dashboard.
 */
export async function getLtrStatus(): Promise<LtrStatus> {
  const [postsCount, conversionsCount] = await Promise.all([
    prisma.post.count({ where: { status: 'PUBLISHED' } }),
    prisma.conversionEvent.count(),
  ])

  const active =
    postsCount >= LTR_THRESHOLDS.postsRequired &&
    conversionsCount >= LTR_THRESHOLDS.conversionsRequired

  return {
    active,
    postsCount,
    conversionsCount,
    thresholds: LTR_THRESHOLDS,
    progress: {
      posts: Math.min(1, postsCount / LTR_THRESHOLDS.postsRequired),
      conversions: Math.min(1, conversionsCount / LTR_THRESHOLDS.conversionsRequired),
    },
    lastRecalculation: null, // TODO: persistir timestamp em cache Redis se necessário
  }
}

/**
 * Calcula novos scores para todos os temas com base em dados reais de conversão.
 * Boost (1.3x): temas acima da média de conversão.
 * Penalidade (0.7x): temas com 5+ posts e zero conversões.
 */
export async function calculateLtrScores(): Promise<ThemeScoreUpdate[]> {
  // Buscar temas com posts publicados via ContentPiece → Post
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const themes = await (prisma as any).theme.findMany({
    select: {
      id: true,
      priorityScore: true,
      contentPieces: {
        select: {
          posts: {
            where: { status: 'PUBLISHED' },
            select: { id: true },
          },
        },
      },
    },
  })

  // Buscar conversões por firstTouchThemeId
  const leads = await prisma.lead.findMany({
    select: {
      firstTouchThemeId: true,
      conversionEvents: { select: { id: true } },
    },
  })

  // Montar mapa themeId → conversões
  const conversionsByTheme = new Map<string, number>()
  for (const lead of leads) {
    if (lead.firstTouchThemeId && lead.conversionEvents.length > 0) {
      const prev = conversionsByTheme.get(lead.firstTouchThemeId) ?? 0
      conversionsByTheme.set(lead.firstTouchThemeId, prev + lead.conversionEvents.length)
    }
  }

  // Calcular posts por tema
  const postsByTheme = new Map<string, number>()
  for (const theme of themes) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const postsCount = theme.contentPieces.reduce((sum: number, piece: any) => sum + (piece.posts?.length ?? 0), 0)
    postsByTheme.set(theme.id, postsCount)
  }

  // Calcular taxa de conversão global
  const totalConversions = [...conversionsByTheme.values()].reduce((a, b) => a + b, 0)
  const totalPosts = [...postsByTheme.values()].reduce((a, b) => a + b, 0)
  const globalConversionRate = totalPosts > 0 ? totalConversions / totalPosts : 0

  const updates: ThemeScoreUpdate[] = []

  for (const theme of themes) {
    const posts = postsByTheme.get(theme.id) ?? 0
    const conversions = conversionsByTheme.get(theme.id) ?? 0
    const themeConversionRate = posts > 0 ? conversions / posts : 0

    let adjustment = 1.0
    let newScore = theme.priorityScore

    if (posts >= LTR_THRESHOLDS.minPostsPerTheme) {
      if (conversions === 0) {
        // Penalidade: tema com 5+ posts e zero conversões
        adjustment = LTR_THRESHOLDS.penaltyMultiplier
      } else if (themeConversionRate > globalConversionRate) {
        // Boost: tema acima da média de conversão
        adjustment = LTR_THRESHOLDS.boostMultiplier
      }
      newScore = Math.min(100, Math.max(0, Math.round(theme.priorityScore * adjustment)))
    }

    updates.push({
      themeId: theme.id,
      previousScore: theme.priorityScore,
      newScore,
      adjustment,
      postsCount: posts,
      conversionsCount: conversions,
    })
  }

  return updates
}

/**
 * Aplica os scores LTR calculados no banco de dados.
 */
export async function applyLtrScores(updates: ThemeScoreUpdate[]): Promise<void> {
  await prisma.$transaction(
    updates
      .filter((u) => u.newScore !== u.previousScore)
      .map((u) =>
        prisma.theme.update({
          where: { id: u.themeId },
          // MS13-B002: LTR ajusta o score composto.
          data: { priorityScore: u.newScore },
        })
      )
  )
}

/**
 * Orquestra o fluxo completo: verifica ativação → calcula → aplica.
 * Retorna { recalculated: false } se LTR não ativo.
 */
export async function recalculateIfActive(): Promise<{
  recalculated: boolean
  themesUpdated: number
  reason?: string
}> {
  const active = await isLtrActive()

  if (!active) {
    return { recalculated: false, themesUpdated: 0, reason: 'Threshold não atingido' }
  }

  const updates = await calculateLtrScores()
  const changedUpdates = updates.filter((u) => u.newScore !== u.previousScore)

  await applyLtrScores(changedUpdates)

  console.info(
    `[LearnToRank] Recalculo concluído | temas atualizados: ${changedUpdates.length}/${updates.length}`
  )

  return { recalculated: true, themesUpdated: changedUpdates.length }
}
