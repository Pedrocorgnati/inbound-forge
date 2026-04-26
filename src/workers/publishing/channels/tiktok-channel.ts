/**
 * TikTok channel adapter — Inbound Forge
 * TASK-6 ST002 / CL-072 (pos-MVP)
 *
 * Rate-limit: 6 req/min por conta (token-bucket via Redis).
 * Conteudo privado (`SELF_ONLY`) enquanto app TikTok nao for aprovado (PENDING-ACTIONS).
 */
import { redis } from '@/lib/redis'
import { TikTokClient } from '@/lib/integrations/tiktok/client'
import type { TikTokTokens } from '@/lib/integrations/tiktok/types'

const RATE_LIMIT_KEY = (accountId: string) => `ratelimit:tiktok:${accountId}`
const RATE_LIMIT_MAX = 6
const RATE_LIMIT_WINDOW_S = 60

// Enquanto app nao for auditado, publicar como SELF_ONLY (CL-072 criterio de aceite)
const DEFAULT_PRIVACY = 'SELF_ONLY' as const

export class RateLimitError extends Error {
  constructor(accountId: string) {
    super(`TikTok rate limit atingido para conta ${accountId} (max ${RATE_LIMIT_MAX}/min)`)
    this.name = 'RateLimitError'
  }
}

async function checkRateLimit(accountId: string): Promise<void> {
  const key = RATE_LIMIT_KEY(accountId)
  const current = await redis.incr(key)
  if (current === 1) await redis.expire(key, RATE_LIMIT_WINDOW_S)
  if (current > RATE_LIMIT_MAX) throw new RateLimitError(accountId)
}

async function getTokens(operatorId: string): Promise<TikTokTokens | null> {
  const raw = await redis.get<string>(`integration:tiktok:tokens:${operatorId}`)
  if (!raw) return null
  return typeof raw === 'string' ? JSON.parse(raw) : (raw as TikTokTokens)
}

export interface PublishItem {
  operatorId: string
  title: string
  videoUrl: string
}

export async function publishToTikTok(item: PublishItem): Promise<{ publishId: string }> {
  const tokens = await getTokens(item.operatorId)
  if (!tokens) throw new Error(`TikTok nao conectado para operador ${item.operatorId}`)

  await checkRateLimit(tokens.openId)

  const client = new TikTokClient()
  const result = await client.uploadVideo(tokens.accessToken, {
    title: item.title,
    privacyLevel: DEFAULT_PRIVACY,
    videoUrl: item.videoUrl,
  })

  return { publishId: result.publishId }
}
