/**
 * UTM Builder — module-12-calendar-publishing
 * CX-04: trackingUrl é preenchido quando module-13 cria UTMLink para o Post.
 * Este módulo apenas constrói a URL (campo nullable até module-13 preencher).
 * INT-065 | CX-04
 */
import { UTM_DEFAULTS } from '@/lib/constants/publishing'
import type { PostUTMLink } from '@/types/publishing'

export function buildUTMUrl(baseUrl: string, utm: PostUTMLink): string {
  const url = new URL(baseUrl)
  url.searchParams.set('utm_source', utm.source)
  url.searchParams.set('utm_medium', utm.medium)
  url.searchParams.set('utm_campaign', utm.campaign)
  if (utm.content) url.searchParams.set('utm_content', utm.content)
  if (utm.term) url.searchParams.set('utm_term', utm.term)
  return url.toString()
}

/**
 * Cria UTM padrão baseado no canal e slug do ContentPiece.
 */
export function buildPostUTM(
  channel: string,
  contentSlug?: string
): PostUTMLink {
  return {
    source: UTM_DEFAULTS.source,
    medium: UTM_DEFAULTS.medium,
    campaign: UTM_DEFAULTS.campaign,
    content: contentSlug
      ? `${channel.toLowerCase()}-${contentSlug}`
      : channel.toLowerCase(),
  }
}
