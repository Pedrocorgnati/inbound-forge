/**
 * UTM Auto Service — Geracao automatica de UTM links no fluxo de
 * aprovacao/publicacao de posts (RS-1, milestone 11).
 *
 * Garante a promessa P6 do BUDGET: "Links rastreaveis sao gerados
 * automaticamente para cada publicacao."
 */
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { buildUTMUrl } from '@/lib/utm-builder'
import { UTM_SOURCES, UTM_MEDIUMS } from '@/constants/utm-constants'
import { auditLog } from '@/lib/audit'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://inbound-forge.vercel.app'

const CHANNEL_TO_MEDIUM: Record<string, string> = {
  INSTAGRAM: UTM_MEDIUMS.INSTAGRAM,
  LINKEDIN: UTM_MEDIUMS.LINKEDIN,
  BLOG: UTM_MEDIUMS.BLOG,
}

function deriveCampaign(post: { id: string; themeId?: string | null; channel: string }): string {
  return post.themeId ? `theme-${post.themeId.slice(0, 8)}` : `post-${post.id.slice(0, 8)}`
}

/**
 * Cria UTMLink + atualiza Post.trackingUrl se ainda nao existir.
 * Idempotente: chamadas repetidas para o mesmo postId nao geram duplicatas.
 *
 * Usado em:
 * - /api/v1/posts/[id]/approve   — apos aprovacao do operador
 * - /api/v1/posts/[id]/publish   — apos publicacao (POST e PATCH)
 *
 * @returns { created: boolean, fullUrl: string }
 */
export async function ensureUTMForPost(
  postId: string,
  options: { userId?: string; tx?: Prisma.TransactionClient } = {},
): Promise<{ created: boolean; fullUrl: string | null }> {
  const db = options.tx ?? prisma

  const post = await db.post.findUnique({
    where: { id: postId },
    select: { id: true, channel: true, themeId: true, trackingUrl: true },
  })
  if (!post) return { created: false, fullUrl: null }

  const existing = await db.uTMLink.findUnique({ where: { postId } })
  if (existing) return { created: false, fullUrl: existing.fullUrl }

  const channel = String(post.channel).toUpperCase()
  const medium = CHANNEL_TO_MEDIUM[channel]
  if (!medium) {
    // Canal nao mapeado (TIKTOK/YOUTUBE post-MVP) — skip silencioso.
    return { created: false, fullUrl: null }
  }

  const campaign = deriveCampaign({
    id: post.id,
    themeId: post.themeId ?? undefined,
    channel,
  })
  const fullUrl = buildUTMUrl(BASE_URL, {
    source: UTM_SOURCES.INBOUND_FORGE,
    medium,
    campaign,
  })

  const link = await db.uTMLink.create({
    data: {
      postId,
      source: UTM_SOURCES.INBOUND_FORGE,
      medium,
      campaign,
      content: '',
      fullUrl,
    },
  })
  await db.post.update({
    where: { id: postId },
    data: { trackingUrl: fullUrl },
  })

  if (options.userId) {
    await auditLog({
      action: 'utm_link.auto_created',
      entityType: 'UTMLink',
      entityId: link.id,
      userId: options.userId,
      metadata: { postId, source: UTM_SOURCES.INBOUND_FORGE, medium, campaign, trigger: 'auto' },
    }).catch(() => void 0)
  }

  return { created: true, fullUrl }
}
