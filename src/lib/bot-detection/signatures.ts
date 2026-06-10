const BOT_USER_AGENT_PATTERNS = [
  /\bbot\b/i,
  /\bcrawler\b/i,
  /\bspider\b/i,
  /\bscrapy\b/i,
  /\bslurp\b/i,
  /\bfacebookexternalhit\b/i,
  /\btwitterbot\b/i,
  /\blinkedinbot\b/i,
  /\bwhatsapp\b/i,
  /\bheadlesschrome\b/i,
] as const

const HEADLESS_HEADER_PATTERNS = [
  /\bheadlesschrome\b/i,
  /\bphantomjs\b/i,
  /\bselenium\b/i,
  /\bplaywright\b/i,
  /\bpuppeteer\b/i,
] as const

export type BotDetectionResult = {
  blocked: boolean
  score: number
  reasons: string[]
}

export function detectBotRequest(headers: Headers): BotDetectionResult {
  const authorization = headers.get('authorization')
  const userAgent = headers.get('user-agent') ?? ''
  const secChUa = headers.get('sec-ch-ua') ?? ''
  const acceptLanguage = headers.get('accept-language') ?? ''
  const reasons: string[] = []
  let score = 0

  if (!userAgent.trim()) {
    score += 35
    reasons.push('missing_user_agent')
  }

  if (BOT_USER_AGENT_PATTERNS.some((pattern) => pattern.test(userAgent))) {
    score += 70
    reasons.push('known_bot_user_agent')
  }

  if (HEADLESS_HEADER_PATTERNS.some((pattern) => pattern.test(`${userAgent} ${secChUa}`))) {
    score += 45
    reasons.push('headless_signature')
  }

  if (!acceptLanguage && userAgent.includes('Mozilla/5.0')) {
    score += 15
    reasons.push('browser_without_accept_language')
  }

  const boundedScore = Math.min(100, score)

  return {
    blocked: !authorization && boundedScore >= 70,
    score: boundedScore,
    reasons,
  }
}
