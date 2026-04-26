/**
 * Anti-bot detector — Inbound Forge
 * TASK-3 ST001 / CL-030
 *
 * Heuristica pura: recebe a resposta HTTP observada (status + headers + trecho de body)
 * e decide se o site esta bloqueando o scraper. A politica do sistema e RESPEITAR o
 * bloqueio — apos N falhas consecutivas a fonte e marcada `antiBotBlocked=true` e o
 * worker deixa de processa-la. Nao ha logica de evasao.
 */

export const ANTI_BOT_FAILURE_THRESHOLD = 3

export interface AntiBotResponseLike {
  status: number
  headers?: Record<string, string | string[] | undefined>
  bodyExcerpt?: string
}

export interface AntiBotDetectionResult {
  isBlocked: boolean
  reason: string | null
}

const BLOCK_STATUSES = new Set([401, 403, 429])

const BLOCK_HEADER_MARKERS: Array<{ header: string; label: string }> = [
  { header: 'cf-mitigated', label: 'Cloudflare challenge' },
  { header: 'cf-chl-bypass', label: 'Cloudflare challenge' },
  { header: 'x-akamai-transformed', label: 'Akamai Bot Manager' },
  { header: 'x-datadome', label: 'DataDome' },
  { header: 'x-perimeterx', label: 'PerimeterX' },
  { header: 'server', label: 'server-header anti-bot' },
]

const SERVER_MARKERS = ['cloudflare', 'akamaighost', 'datadome', 'perimeterx']

const BODY_MARKERS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bcaptcha\b/i, label: 'captcha presente no HTML' },
  { pattern: /cf-browser-verification/i, label: 'Cloudflare browser verification' },
  { pattern: /attention required\s*\|\s*cloudflare/i, label: 'Cloudflare block page' },
  { pattern: /access denied/i, label: 'pagina de access denied' },
  { pattern: /bot.{0,15}detect/i, label: 'pagina de bot detection' },
]

function normalizeHeaderValue(value: string | string[] | undefined): string | null {
  if (!value) return null
  return Array.isArray(value) ? value.join(' ').toLowerCase() : value.toLowerCase()
}

export function detectAntiBot(response: AntiBotResponseLike): AntiBotDetectionResult {
  const headers = response.headers ?? {}

  if (BLOCK_STATUSES.has(response.status)) {
    return { isBlocked: true, reason: `HTTP ${response.status}` }
  }

  for (const { header, label } of BLOCK_HEADER_MARKERS) {
    const val = normalizeHeaderValue(headers[header])
    if (!val) continue
    if (header === 'server') {
      if (SERVER_MARKERS.some((m) => val.includes(m))) {
        return { isBlocked: true, reason: `${label}: ${val}` }
      }
      continue
    }
    return { isBlocked: true, reason: label }
  }

  if (response.bodyExcerpt) {
    for (const { pattern, label } of BODY_MARKERS) {
      if (pattern.test(response.bodyExcerpt)) {
        return { isBlocked: true, reason: label }
      }
    }
  }

  if (response.status >= 300 && response.status < 400) {
    const location = normalizeHeaderValue(headers['location'])
    if (location && /(login|sign[_-]?in|auth)/.test(location)) {
      return { isBlocked: true, reason: 'redirect para login' }
    }
  }

  return { isBlocked: false, reason: null }
}
