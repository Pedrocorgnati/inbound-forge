// Inbound F1 — servico de subscribers (double-opt-in LGPD).
// subscribe -> PENDING + email de confirmacao; confirm -> CONFIRMED; unsubscribe -> UNSUBSCRIBED.
// Email criptografado (encryptPayload) + emailHash deterministico p/ dedup. SEC-008: sem PII em log.
import 'server-only'
import type { Channel } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { encryptPayload, decryptPayload } from '@/lib/pii/encrypt'
import { hashContactInfo, normalizeEmail } from '@/lib/leads/contact-hash'
import { mintSubscriberToken, verifySubscriberToken } from './subscriber-token'
import { sendMarketingEmail } from './marketing-send'

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}
export function buildConfirmUrl(token: string): string {
  return `${baseUrl()}/api/subscribe/confirm?token=${encodeURIComponent(token)}`
}
export function buildUnsubscribeUrl(token: string): string {
  return `${baseUrl()}/api/unsubscribe?token=${encodeURIComponent(token)}`
}

export function decryptSubscriberEmail(encryptedEmail: string): string {
  try {
    return decryptPayload<{ email: string }>(encryptedEmail).email
  } catch {
    return ''
  }
}

function buildConfirmHtml(confirmUrl: string, unsubscribeUrl: string): string {
  return [
    '<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">',
    '<h1 style="font-size:20px">Confirme sua inscricao</h1>',
    '<p>Clique no botao abaixo para confirmar que voce quer receber nossos conteudos.</p>',
    `<p style="margin:24px 0"><a href="${confirmUrl}" style="background:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Confirmar inscricao</a></p>`,
    '<p style="font-size:12px;color:#64748b">Se voce nao se inscreveu, ignore este email.</p>',
    `<p style="font-size:12px;color:#94a3b8">Nao quer mais receber? <a href="${unsubscribeUrl}" style="color:#94a3b8">Descadastrar</a>.</p>`,
    '</div>',
  ].join('')
}

export interface SubscribeInput {
  email: string
  lgpdConsent: boolean
  channel?: Channel | null
  source?: string | null
  leadId?: string | null
  sourceIpHash?: string | null
  userAgent?: string | null
}

export type SubscribeResult = { status: 'created' | 'pending' | 'confirmed'; subscriberId: string }

/** Idempotente por emailHash. Reenvia confirmacao se ainda PENDING; reabre se UNSUBSCRIBED. */
export async function subscribe(input: SubscribeInput): Promise<SubscribeResult> {
  const email = normalizeEmail(input.email)
  const emailHash = hashContactInfo({ email })
  const now = new Date()

  const existing = await prisma.emailSubscriber.findUnique({ where: { emailHash } })
  if (existing) {
    if (existing.status === 'CONFIRMED') return { status: 'confirmed', subscriberId: existing.id }
    if (existing.status === 'BOUNCED' || existing.status === 'COMPLAINED') {
      return { status: 'pending', subscriberId: existing.id }
    }
    // PENDING ou UNSUBSCRIBED: reabre como PENDING e reenvia confirmacao
    await prisma.emailSubscriber.update({
      where: { id: existing.id },
      data: { status: 'PENDING', unsubscribedAt: null, lgpdConsent: input.lgpdConsent, lgpdConsentAt: now },
    })
    await dispatchConfirmEmail(existing.id, email)
    return { status: 'pending', subscriberId: existing.id }
  }

  const sub = await prisma.emailSubscriber.create({
    data: {
      encryptedEmail: encryptPayload({ email }),
      emailHash,
      status: 'PENDING',
      channel: input.channel ?? null,
      source: input.source ?? null,
      leadId: input.leadId ?? null,
      lgpdConsent: input.lgpdConsent,
      lgpdConsentAt: now,
      sourceIpHash: input.sourceIpHash ?? null,
      userAgent: input.userAgent ?? null,
    },
  })
  await dispatchConfirmEmail(sub.id, email)
  return { status: 'created', subscriberId: sub.id }
}

async function dispatchConfirmEmail(subscriberId: string, email: string): Promise<void> {
  const confirmUrl = buildConfirmUrl(mintSubscriberToken(subscriberId, 'confirm'))
  const unsubscribeUrl = buildUnsubscribeUrl(mintSubscriberToken(subscriberId, 'unsubscribe'))
  // best-effort: falha de email nunca quebra o fluxo de inscricao
  await sendMarketingEmail({
    to: email,
    subject: 'Confirme sua inscricao',
    html: buildConfirmHtml(confirmUrl, unsubscribeUrl),
    unsubscribeUrl,
  }).catch(() => undefined)
}

export async function confirmSubscriber(token: string): Promise<{ ok: boolean; reason?: string; subscriberId?: string }> {
  const v = verifySubscriberToken(token, 'confirm')
  if (!v.ok) return { ok: false, reason: v.reason }
  const sub = await prisma.emailSubscriber.findUnique({ where: { id: v.subscriberId } })
  if (!sub) return { ok: false, reason: 'not_found' }
  if (sub.status === 'UNSUBSCRIBED') return { ok: false, reason: 'unsubscribed' }
  if (sub.status !== 'CONFIRMED') {
    await prisma.emailSubscriber.update({
      where: { id: sub.id },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
    })
  }
  return { ok: true, subscriberId: sub.id }
}

export async function unsubscribeByToken(token: string): Promise<{ ok: boolean; reason?: string }> {
  const v = verifySubscriberToken(token, 'unsubscribe')
  if (!v.ok) return { ok: false, reason: v.reason }
  const sub = await prisma.emailSubscriber.findUnique({ where: { id: v.subscriberId } })
  if (!sub) return { ok: false, reason: 'not_found' }
  if (sub.status !== 'UNSUBSCRIBED') {
    await prisma.emailSubscriber.update({
      where: { id: sub.id },
      data: { status: 'UNSUBSCRIBED', unsubscribedAt: new Date() },
    })
  }
  return { ok: true }
}
