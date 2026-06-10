// Inbound F2 — captura de lead via form publico. Reusa a logica de Lead (encrypt +
// contactHash dedup + first-touch fallback) e a inscricao de email (F1) num so fluxo.
// Robusto: se nao houver Theme/Post (projeto novo), o Lead e PULADO mas o subscriber +
// a submissao sao SEMPRE registrados (ECU — captura nunca se perde). SEC-008: sem PII em log.
import 'server-only'
import { randomUUID } from 'crypto'
import type { Channel } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { encryptPII } from '@/lib/crypto'
import { encryptPayload } from '@/lib/pii/encrypt'
import { hashContactInfo } from '@/lib/leads/contact-hash'
import { subscribe } from '@/lib/email/subscriber'
import { sendLeadCapturedEmail } from '@/lib/notifications/lead-captured.email'
import { trackServerEvent } from '@/lib/ga4-measurement-protocol'
import { GA4_EVENTS } from '@/constants/ga4-events'
import { recomputeLeadScore } from '@/lib/leads/lead-score'

export interface CaptureInput {
  formId: string
  email: string
  name?: string | null
  company?: string | null
  channel?: Channel | null
  lgpdConsent: boolean
  source?: string | null
  utm?: { source?: string | null; medium?: string | null; campaign?: string | null }
  sourceIpHash?: string | null
  userAgent?: string | null
}

export interface CaptureResult {
  subscriberId: string
  leadId: string | null
  submissionId: string
  leadDuplicate: boolean
}

/** Tenta criar o Lead; retorna null se faltam Theme/Post (sem quebrar a captura). */
async function tryCreateLead(input: CaptureInput): Promise<{ leadId: string | null; duplicate: boolean }> {
  const theme = await prisma.theme.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } })
  if (!theme) return { leadId: null, duplicate: false }
  const post = await prisma.post.findFirst({ where: { themeId: theme.id }, orderBy: { createdAt: 'asc' }, select: { id: true } })
  if (!post) return { leadId: null, duplicate: false }

  const contactHash = hashContactInfo({ email: input.email })
  const existing = await prisma.lead.findUnique({ where: { contactHash }, select: { id: true } })
  if (existing) return { leadId: existing.id, duplicate: true }

  const lead = await prisma.lead.create({
    data: {
      firstTouchPostId: post.id,
      firstTouchThemeId: theme.id,
      name: input.name ?? null,
      company: input.company ?? null,
      contactInfo: encryptPII(input.email),
      contactHash,
      channel: input.channel ?? null,
      lgpdConsent: input.lgpdConsent,
      lgpdConsentAt: new Date(),
      firstTouchAt: new Date(),
    },
  })
  await prisma.conversionEvent.create({
    data: {
      leadId: lead.id,
      type: 'FORM_SUBMISSION',
      occurredAt: new Date(),
      utmCampaign: input.utm?.campaign ?? null,
      channel: input.channel ?? null,
    },
  })
  return { leadId: lead.id, duplicate: false }
}

export async function createLeadFromCapture(input: CaptureInput): Promise<CaptureResult> {
  const correlationId = randomUUID()

  // 1. Sempre inscreve o email (F1) — captura primaria, idempotente.
  const sub = await subscribe({
    email: input.email,
    lgpdConsent: input.lgpdConsent,
    channel: input.channel ?? null,
    source: input.source ?? 'form',
    sourceIpHash: input.sourceIpHash ?? null,
    userAgent: input.userAgent ?? null,
  })

  // 2. Tenta criar o Lead (best-effort — nao quebra se faltarem Theme/Post).
  let leadResult: { leadId: string | null; duplicate: boolean } = { leadId: null, duplicate: false }
  try {
    leadResult = await tryCreateLead(input)
  } catch {
    leadResult = { leadId: null, duplicate: false }
  }

  // 3. Vincula subscriber <-> lead quando ambos existem + recalcula score (F3).
  if (leadResult.leadId) {
    await prisma.emailSubscriber.update({ where: { id: sub.subscriberId }, data: { leadId: leadResult.leadId } }).catch(() => undefined)
    await recomputeLeadScore(leadResult.leadId).catch(() => undefined)
  }

  // 4. Registra a submissao (auditoria append-only) + incrementa contador do form.
  const submission = await prisma.leadFormSubmission.create({
    data: {
      formId: input.formId,
      leadId: leadResult.leadId,
      subscriberId: sub.subscriberId,
      encryptedPayload: encryptPayload({ name: input.name ?? null, email: input.email, company: input.company ?? null }),
      correlationId,
      utmSource: input.utm?.source ?? null,
      utmMedium: input.utm?.medium ?? null,
      utmCampaign: input.utm?.campaign ?? null,
      sourceIpHash: input.sourceIpHash ?? null,
      userAgent: input.userAgent ?? null,
      lgpdConsent: input.lgpdConsent,
      lgpdConsentAt: new Date(),
    },
  })
  await prisma.leadForm.update({ where: { id: input.formId }, data: { submissionCount: { increment: 1 } } }).catch(() => undefined)

  // 5. Notificacao operador (sem PII) + GA4 — best-effort.
  void sendLeadCapturedEmail({ leadSource: input.source ?? 'form', utmCampaign: input.utm?.campaign ?? null, capturedAt: new Date() }).catch(() => undefined)
  void trackServerEvent({ name: GA4_EVENTS.LEAD_CREATED, params: { channel: input.channel ?? '', source: input.source ?? 'form' } }).catch(() => undefined)

  return { subscriberId: sub.subscriberId, leadId: leadResult.leadId, submissionId: submission.id, leadDuplicate: leadResult.duplicate }
}
