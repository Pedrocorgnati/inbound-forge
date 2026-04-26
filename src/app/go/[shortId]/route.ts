/**
 * GET /go/{shortId} — redirect rastreavel para CTA externo (WhatsApp, etc).
 *
 * Intake-Review TASK-1 (CL-275): incrementa clickCount atomico, anexa UTM
 * ao targetUrl e redireciona 302. Em producao, GA4 captura o clique pela
 * navegacao outbound (pageview antes do redirect).
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { buildUTMUrl } from '@/lib/utm-builder'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shortId: string }> },
) {
  const { shortId } = await params

  if (!shortId || shortId.length > 12) {
    return NextResponse.redirect(new URL('/404', request.url), 302)
  }

  const shortlink = await prisma.shortlink.findUnique({ where: { shortId } })

  if (!shortlink) {
    return NextResponse.redirect(new URL('/404', request.url), 302)
  }

  // Incrementa clickCount atomicamente (fire-and-forget — nao bloqueia redirect)
  prisma.shortlink
    .update({ where: { id: shortlink.id }, data: { clickCount: { increment: 1 } } })
    .catch(() => { /* nao afeta redirect do usuario */ })

  const targetUrl = buildUTMUrl(shortlink.targetUrl, {
    source: shortlink.utmSource ?? 'shortlink',
    medium: shortlink.utmMedium ?? 'direct',
    campaign: shortlink.utmCampaign ?? shortId,
    content: shortlink.utmContent ?? undefined,
    term: shortlink.utmTerm ?? undefined,
  })

  return NextResponse.redirect(targetUrl, 302)
}
