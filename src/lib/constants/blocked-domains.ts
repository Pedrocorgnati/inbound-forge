/**
 * Blocked Domains — INT-136
 * TASK-4 / module-6-scraping-worker
 *
 * Domínios proibidos para scraping (redes sociais fechadas).
 * INT-136: nunca incluir LinkedIn, Facebook ou equivalentes.
 */

export const BLOCKED_DOMAINS = [
  'linkedin.com',
  'www.linkedin.com',
  'facebook.com',
  'www.facebook.com',
  'instagram.com',
  'www.instagram.com',
  'tiktok.com',
  'www.tiktok.com',
  'twitter.com',
  'x.com',
  'snapchat.com',
  'pinterest.com',
  'whatsapp.com',
] as const

export type BlockedDomain = (typeof BLOCKED_DOMAINS)[number]

/**
 * Verifica se uma URL pertence a um domínio bloqueado.
 */
export function isBlockedDomain(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    return BLOCKED_DOMAINS.some(
      (blocked) => hostname === blocked || hostname.endsWith(`.${blocked}`)
    )
  } catch {
    return false
  }
}
