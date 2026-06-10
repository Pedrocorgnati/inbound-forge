/**
 * GET /go/{shortId} — redirect rastreavel para CTA externo (WhatsApp, etc).
 *
 * Intake-Review TASK-1 (CL-275): incrementa clickCount atomico, anexa UTM
 * ao targetUrl e redireciona 302. Em producao, GA4 captura o clique pela
 * navegacao outbound (pageview antes do redirect).
 */
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { buildUTMUrl } from '@/lib/utm-builder'
import { detectBotRequest } from '@/lib/bot-detection/signatures'
import {
  applyRateLimitHeaders,
  checkClickDedup,
  checkPublicIpRateLimit,
  checkShortlinkClickRateLimit,
  extractClientIp,
  rateLimitExceededResponse,
} from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shortId: string }> },
) {
  const { shortId } = await params
  const correlationId = crypto.randomUUID()
  const ip = extractClientIp(request.headers)
  const userAgent = request.headers.get('user-agent') ?? ''
  const ipRateLimit = await checkPublicIpRateLimit(ip, 'shortlink-redirect')
  const bot = detectBotRequest(request.headers)

  if (!shortId || shortId.length > 12) {
    return applyRateLimitHeaders(NextResponse.redirect(new URL('/404', request.url), 302), ipRateLimit, correlationId)
  }

  if (!ipRateLimit.allowed) {
    console.warn(`[shortlink.click] ${JSON.stringify({
      correlation_id: correlationId,
      shortlink_id: shortId,
      dedup_status: 'ip_rate_limited',
      bot_score: bot.score,
    })}`)
    return rateLimitExceededResponse(ipRateLimit, correlationId)
  }

  if (bot.blocked) {
    console.warn(`[shortlink.click] ${JSON.stringify({
      correlation_id: correlationId,
      shortlink_id: shortId,
      dedup_status: 'bot_blocked',
      bot_score: bot.score,
      bot_reasons: bot.reasons,
    })}`)
    return applyRateLimitHeaders(
      NextResponse.json(
        {
          success: false,
          error: 'BOT_BLOCKED',
          correlation_id: correlationId,
          bot_score: bot.score,
        },
        { status: 403 },
      ),
      ipRateLimit,
      correlationId,
    )
  }

  const shortlink = await prisma.shortlink.findUnique({ where: { shortId } })

  if (!shortlink) {
    return applyRateLimitHeaders(NextResponse.redirect(new URL('/404', request.url), 302), ipRateLimit, correlationId)
  }

  const shortlinkRateLimit = await checkShortlinkClickRateLimit(shortId)
  const dedup = await checkClickDedup({ ip, userAgent, shortlinkId: shortId })
  const dedupStatus = !shortlinkRateLimit.allowed
    ? 'shortlink_rate_limited'
    : dedup.duplicate
      ? 'duplicate'
      : 'counted'

  if (dedupStatus === 'counted') {
    prisma.shortlink
      .update({ where: { id: shortlink.id }, data: { clickCount: { increment: 1 } } })
      .catch(() => { /* nao afeta redirect do usuario */ })
  }

  const targetUrl = buildUTMUrl(shortlink.targetUrl, {
    source: shortlink.utmSource ?? 'shortlink',
    medium: shortlink.utmMedium ?? 'direct',
    campaign: shortlink.utmCampaign ?? shortId,
    content: shortlink.utmContent ?? undefined,
    term: shortlink.utmTerm ?? undefined,
  })

  console.info(`[shortlink.click] ${JSON.stringify({
    correlation_id: correlationId,
    shortlink_id: shortId,
    dedup_status: dedupStatus,
    bot_score: bot.score,
    bot_reasons: bot.reasons,
  })}`)

  const response = applyRateLimitHeaders(NextResponse.redirect(targetUrl, 302), ipRateLimit, correlationId)
  response.headers.set('X-Shortlink-RateLimit-Limit', String(shortlinkRateLimit.limit))
  response.headers.set('X-Shortlink-RateLimit-Remaining', String(shortlinkRateLimit.remaining))
  response.headers.set('X-Dedup-Status', dedupStatus)
  response.headers.set('X-Bot-Score', String(bot.score))
  return response
}
