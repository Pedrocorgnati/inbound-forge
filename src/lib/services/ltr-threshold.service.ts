/**
 * LTR Threshold Service — Intake Review TASK-6 (CL-096, CL-097, CL-098).
 *
 * Gatilho de transicao do scoring estatico (PRE_LTR) para scoring com
 * historical conversion rate (POST_LTR) quando o sistema acumula
 * 50+ posts publicados e 10+ conversoes.
 *
 * Cache em memoria de 60s para evitar recomputacao em cada scoring call.
 */
import { prisma } from '@/lib/prisma'

export const LTR_POSTS_THRESHOLD = 50
export const LTR_CONVERSIONS_THRESHOLD = 10

export type ScoringPhase = 'PRE_LTR' | 'POST_LTR'

export interface PhaseSnapshot {
  phase: ScoringPhase
  postsCount: number
  conversionsCount: number
  postsRemaining: number
  conversionsRemaining: number
  thresholds: { posts: number; conversions: number }
}

const CACHE_TTL_MS = 60_000
let cache: { at: number; snapshot: PhaseSnapshot } | null = null

export function computePhase(input: { posts: number; conversions: number }): ScoringPhase {
  return input.posts >= LTR_POSTS_THRESHOLD && input.conversions >= LTR_CONVERSIONS_THRESHOLD
    ? 'POST_LTR'
    : 'PRE_LTR'
}

export async function getPostsCount(): Promise<number> {
  return prisma.post.count({ where: { status: 'PUBLISHED' } })
}

export async function getConversionsCount(): Promise<number> {
  return prisma.conversionEvent.count()
}

export async function getScoringPhase(options: { force?: boolean } = {}): Promise<PhaseSnapshot> {
  const now = Date.now()
  if (!options.force && cache && now - cache.at < CACHE_TTL_MS) {
    return cache.snapshot
  }

  const [posts, conversions] = await Promise.all([getPostsCount(), getConversionsCount()])
  const phase = computePhase({ posts, conversions })

  const snapshot: PhaseSnapshot = {
    phase,
    postsCount: posts,
    conversionsCount: conversions,
    postsRemaining: Math.max(0, LTR_POSTS_THRESHOLD - posts),
    conversionsRemaining: Math.max(0, LTR_CONVERSIONS_THRESHOLD - conversions),
    thresholds: { posts: LTR_POSTS_THRESHOLD, conversions: LTR_CONVERSIONS_THRESHOLD },
  }
  cache = { at: now, snapshot }
  return snapshot
}

export function invalidatePhaseCache(): void {
  cache = null
}
