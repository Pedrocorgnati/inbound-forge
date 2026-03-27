/**
 * Tipos UTM — Rastreabilidade: INT-028, INT-029
 */

export interface UTMParams {
  source: string
  medium: string
  campaign: string
  term?: string
  content?: string
}

export interface WhatsAppUTMConfig {
  phoneNumber: string  // E.164 sem + ex: "5511999999999"
  themeSlug: string
  postId: string
  temaNome: string
}

export interface BlogUTMConfig {
  slug: string         // post slug no blog
  themeSlug: string
  postId: string
}

export interface UTMBuilderConfig {
  baseUrl: string
  params: UTMParams
}
