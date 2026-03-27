/**
 * UTM Builder — Rastreabilidade: INT-028, FEAT-tracking-analytics-010
 * Funções: buildUTMUrl, buildWhatsAppUrl, buildBlogUrl
 * SEC: nunca logar contactInfo — SEC-008
 */
import type { UTMParams, WhatsAppUTMConfig, BlogUTMConfig } from '@/types/utm'
import { UTM_SOURCES, UTM_MEDIUMS } from '@/constants/utm-constants'

const BLOG_BASE_URL = process.env.NEXT_PUBLIC_BLOG_BASE_URL ?? 'https://inbound-forge.vercel.app/blog'

/**
 * Constrói URL com query params UTM devidamente encodados.
 * Preserva query params existentes na baseUrl.
 */
export function buildUTMUrl(baseUrl: string, params: UTMParams): string {
  const url = new URL(baseUrl)
  if (params.source) url.searchParams.set('utm_source', params.source)
  if (params.medium) url.searchParams.set('utm_medium', params.medium)
  if (params.campaign) url.searchParams.set('utm_campaign', params.campaign)
  if (params.content) url.searchParams.set('utm_content', params.content)
  if (params.term) url.searchParams.set('utm_term', params.term)
  return url.toString()
}

/**
 * Constrói URL de WhatsApp com mensagem contextualizada encodada.
 * Formato: wa.me/{phone}?text={encoded_msg}&utm_source=...
 */
export function buildWhatsAppUrl(config: WhatsAppUTMConfig): string {
  const mensagem = `Oi, vi seu conteúdo sobre ${config.temaNome} e gostaria de entender como isso se aplica ao meu caso.`
  const baseUrl = `https://wa.me/${config.phoneNumber}`
  const url = new URL(baseUrl)
  url.searchParams.set('text', mensagem)
  url.searchParams.set('utm_source', UTM_SOURCES.INBOUND_FORGE)
  url.searchParams.set('utm_medium', UTM_MEDIUMS.WHATSAPP)
  url.searchParams.set('utm_campaign', config.themeSlug)
  url.searchParams.set('utm_content', config.postId)
  return url.toString()
}

/**
 * Constrói URL de blog com UTM params.
 * Formato: {BLOG_BASE_URL}/{slug}?utm_source=inbound-forge&utm_medium=blog&...
 */
export function buildBlogUrl(config: BlogUTMConfig): string {
  const baseUrl = `${BLOG_BASE_URL}/${config.slug}`
  return buildUTMUrl(baseUrl, {
    source: UTM_SOURCES.INBOUND_FORGE,
    medium: UTM_MEDIUMS.BLOG,
    campaign: config.themeSlug,
    content: config.postId,
  })
}
