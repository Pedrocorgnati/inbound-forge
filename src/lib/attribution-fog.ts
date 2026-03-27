/**
 * Fog Mitigation — INT-074
 * Mitigar leads sem UTM usando correlação por canal + janela temporal.
 * NUNCA bloqueia criação de lead — sempre best-effort.
 * SEC-008: nunca logar lead.contactInfo
 */
import { prisma } from '@/lib/prisma'
import { ATTRIBUTION_WINDOW_DAYS, ATTRIBUTION_CONFIDENCE } from '@/constants/attribution-constants'
import type { Lead } from '@/types/leads'
import type { AttributionResult } from '@/types/leads'

/**
 * Aplica fog mitigation: tenta inferir atribuição via canal + janela de tempo.
 * Retorna AttributionResult (inferred=true) ou null se não for possível inferir.
 */
export async function applyFogMitigation(
  lead: Pick<Lead, 'id' | 'channel' | 'firstTouchThemeId'>
): Promise<AttributionResult | null> {
  // Sem canal → impossível correlacionar
  if (!lead.channel) return null

  try {
    const windowStart = new Date()
    windowStart.setDate(windowStart.getDate() - ATTRIBUTION_WINDOW_DAYS)

    // Buscar posts do mesmo tema, mesmo canal, nos últimos ATTRIBUTION_WINDOW_DAYS dias
    const recentPosts = await prisma.post.findMany({
      where: {
        channel: lead.channel,
        contentPiece: { themeId: lead.firstTouchThemeId },
        createdAt: { gte: windowStart },
      },
      include: { utmLink: true },
      orderBy: { createdAt: 'desc' },
      take: 1,
    })

    if (recentPosts.length === 0) return null

    const inferredPost = recentPosts[0]

    return {
      type: 'INFERRED',
      postId: inferredPost.id,
      source: inferredPost.utmLink?.source ?? lead.channel.toLowerCase(),
      campaign: inferredPost.utmLink?.campaign,
      medium: lead.channel.toLowerCase(),
      confidence: ATTRIBUTION_CONFIDENCE.FOG_INFERRED,
      inferred: true,
    }
  } catch {
    // Fog mitigation NUNCA bloqueia — falha silenciosa
    return null
  }
}
