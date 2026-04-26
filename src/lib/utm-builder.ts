/**
 * UTM Builder — Rastreabilidade: INT-028, FEAT-tracking-analytics-010
 * Funções: buildUTMUrl, buildWhatsAppUrl, buildBlogUrl
 * SEC: nunca logar contactInfo — SEC-008
 */
import type { UTMParams, WhatsAppUTMConfig, BlogUTMConfig } from '@/types/utm'
import { UTM_SOURCES, UTM_MEDIUMS } from '@/constants/utm-constants'

/** Intake Review TASK-9 ST004 (CL-087). */
export class MissingUtmError extends Error {
  constructor(public readonly field: string) {
    super(`UTM ${field} e obrigatorio para CTAs`)
    this.name = 'MissingUtmError'
  }
}

/** Intake Review TASK-5 ST003 (CL-089). */
export type CTADestinationType = 'CTA_WHATSAPP' | 'CTA_BLOG' | 'CTA_CALENDAR' | 'CTA_CUSTOM'

export interface BuildCtaUrlParams {
  /** Apenas quando type=CTA_WHATSAPP */
  phone?: string
  /** Apenas quando type=CTA_WHATSAPP (mensagem pre-preenchida) */
  msg?: string
  /** Apenas quando type=CTA_BLOG */
  slug?: string
  /** Apenas quando type=CTA_CUSTOM */
  baseUrl?: string
  /** Apenas quando type=CTA_CALENDAR */
  calendarUrl?: string
  leadId?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  utmTerm?: string
}

/**
 * Roteador de CTA por tipo de destino.
 * - CTA_WHATSAPP  -> https://wa.me/{phone}?text=...
 * - CTA_BLOG      -> {BLOG_BASE_URL}/{slug}
 * - CTA_CALENDAR  -> Cal.com event URL
 * - CTA_CUSTOM    -> baseUrl fornecido
 *
 * UTM sempre anexado via query string. Para CTAs comerciais (WHATSAPP, CALENDAR)
 * `utmCampaign` e obrigatorio — TASK-9 ST004 (CL-087).
 */
export function buildCtaUrl(type: CTADestinationType, params: BuildCtaUrlParams = {}): string {
  if (
    (type === 'CTA_WHATSAPP' || type === 'CTA_CALENDAR') &&
    !params.utmCampaign
  ) {
    throw new MissingUtmError('campaign')
  }

  if (type === 'CTA_WHATSAPP') {
    if (!params.phone) throw new Error('phone obrigatorio para CTA_WHATSAPP')
    const url = new URL(`https://wa.me/${params.phone.replace(/[^0-9]/g, '')}`)
    if (params.msg) url.searchParams.set('text', params.msg)
    return applyUtms(url, params, UTM_MEDIUMS.WHATSAPP).toString()
  }

  if (type === 'CTA_BLOG') {
    if (!params.slug) throw new Error('slug obrigatorio para CTA_BLOG')
    const url = new URL(`${BLOG_BASE_URL}/${params.slug}`)
    return applyUtms(url, params, UTM_MEDIUMS.BLOG).toString()
  }

  if (type === 'CTA_CALENDAR') {
    const base =
      params.calendarUrl ??
      process.env.NEXT_PUBLIC_CAL_COM_EVENT_URL ??
      process.env.CAL_COM_EVENT_URL ??
      'https://cal.com/inbound-forge/discovery'
    const url = new URL(base)
    if (params.leadId) url.searchParams.set('metadata[leadId]', params.leadId)
    if (params.utmCampaign) url.searchParams.set('metadata[utm_campaign]', params.utmCampaign)
    return applyUtms(url, params, UTM_MEDIUMS.CALENDAR).toString()
  }

  // CTA_CUSTOM
  if (!params.baseUrl) throw new Error('baseUrl obrigatorio para CTA_CUSTOM')
  const url = new URL(params.baseUrl)
  return applyUtms(url, params).toString()
}

function applyUtms(url: URL, params: BuildCtaUrlParams, defaultMedium?: string): URL {
  if (params.utmSource) url.searchParams.set('utm_source', params.utmSource)
  else url.searchParams.set('utm_source', UTM_SOURCES.INBOUND_FORGE)
  if (params.utmMedium) url.searchParams.set('utm_medium', params.utmMedium)
  else if (defaultMedium) url.searchParams.set('utm_medium', defaultMedium)
  if (params.utmCampaign) url.searchParams.set('utm_campaign', params.utmCampaign)
  if (params.utmContent) url.searchParams.set('utm_content', params.utmContent)
  if (params.utmTerm) url.searchParams.set('utm_term', params.utmTerm)
  return url
}

const BLOG_BASE_URL = process.env.NEXT_PUBLIC_BLOG_BASE_URL ?? 'https://inbound-forge.vercel.app/blog'

/**
 * Cal.com calendar URL builder — Intake Review TASK-1 (CL-105).
 * Preserva UTMs e permite anexar metadata.leadId (prefill ?metadata[leadId]=)
 * para reconciliacao no webhook.
 */
export interface CalendarUTMConfig {
  calendarUrl?: string
  temaId?: string
  themeSlug?: string
  postId?: string
  leadId?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  utmTerm?: string
}

export function buildCalendarUrl(config: CalendarUTMConfig = {}): string {
  const baseUrl =
    config.calendarUrl ??
    process.env.NEXT_PUBLIC_CAL_COM_EVENT_URL ??
    process.env.CAL_COM_EVENT_URL ??
    'https://cal.com/inbound-forge/discovery'
  const withUtms = buildUTMUrl(baseUrl, {
    source: config.utmSource ?? UTM_SOURCES.INBOUND_FORGE,
    medium: config.utmMedium ?? UTM_MEDIUMS.CALENDAR,
    campaign: config.utmCampaign ?? config.themeSlug ?? config.temaId ?? '',
    content: config.utmContent ?? config.postId ?? '',
    term: config.utmTerm,
  })
  const url = new URL(withUtms)
  // Cal.com prefilling: metadata[leadId] e ecoado no payload do webhook,
  // permitindo reconciliar booking -> Lead sem depender de email em claro.
  if (config.leadId) url.searchParams.set('metadata[leadId]', config.leadId)
  const campaign = config.utmCampaign ?? config.themeSlug ?? config.temaId
  if (campaign) url.searchParams.set('metadata[utm_campaign]', campaign)
  return url.toString()
}

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

/**
 * Cria um shortlink rastreavel para WhatsApp chamando POST /api/v1/shortlinks.
 *
 * Intake-Review TASK-1 (CL-275): substitui o uso direto de wa.me em CTAs por
 * um redirect `/go/{shortId}` que incrementa clickCount e preserva UTM.
 *
 * Deve ser chamado no submit do formulario do Post, nao no onChange do campo
 * (evita criar shortlinks descartaveis a cada edicao).
 */
export async function buildWhatsAppShortlink(config: WhatsAppUTMConfig): Promise<string> {
  const waUrl = buildWhatsAppUrl(config)
  const res = await fetch('/api/v1/shortlinks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      targetUrl: waUrl,
      channel: 'whatsapp',
      utmSource: UTM_SOURCES.INBOUND_FORGE,
      utmMedium: UTM_MEDIUMS.WHATSAPP,
      utmCampaign: config.themeSlug,
      utmContent: config.postId,
      postId: config.postId,
    }),
  })
  if (!res.ok) throw new Error(`Falha ao criar shortlink (${res.status})`)
  const body = await res.json()
  return body.data.url as string
}
