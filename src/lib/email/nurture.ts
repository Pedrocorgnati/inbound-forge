// Inbound F4 — motor de nurture sequences (drip). Enrolla subscribers CONFIRMED
// e envia os steps devidos via o transporte de F1 (com unsubscribe obrigatorio).
// Reusa injectUnsubscribe/sendMarketingEmail de F1. SEC-008: sem PII em log.
import 'server-only'
import { prisma } from '@/lib/prisma'
import { sendMarketingEmail } from './marketing-send'
import { mintSubscriberToken } from './subscriber-token'
import { buildUnsubscribeUrl, decryptSubscriberEmail } from './subscriber'
import { injectUnsubscribe } from './broadcast-sender'

const HOUR_MS = 3600 * 1000

/** Inscreve o subscriber em todas as sequences ACTIVE+autoEnroll. Idempotente (unique). */
export async function enrollSubscriber(subscriberId: string): Promise<number> {
  const sequences = await prisma.nurtureSequence.findMany({
    where: { status: 'ACTIVE', autoEnroll: true },
    include: { steps: { orderBy: { order: 'asc' }, take: 1 } },
  })
  let enrolled = 0
  for (const seq of sequences) {
    const firstStep = seq.steps[0]
    if (!firstStep) continue // sequence sem steps: nada a enviar
    const nextStepAt = new Date(Date.now() + firstStep.delayHours * HOUR_MS)
    try {
      await prisma.nurtureEnrollment.create({
        data: { sequenceId: seq.id, subscriberId, currentStep: 0, nextStepAt },
      })
      enrolled++
    } catch {
      // violacao de unique = ja inscrito (idempotente)
    }
  }
  return enrolled
}

/** Inscreve um subscriber numa sequence ESPECIFICA (idempotente). Usado por F5. */
export async function enrollInSequence(subscriberId: string, sequenceId: string): Promise<boolean> {
  const seq = await prisma.nurtureSequence.findUnique({
    where: { id: sequenceId },
    include: { steps: { orderBy: { order: 'asc' }, take: 1 } },
  })
  if (!seq || seq.status === 'ARCHIVED' || seq.steps.length === 0) return false
  const nextStepAt = new Date(Date.now() + seq.steps[0].delayHours * HOUR_MS)
  try {
    await prisma.nurtureEnrollment.create({ data: { sequenceId, subscriberId, currentStep: 0, nextStepAt } })
    return true
  } catch {
    return false // ja inscrito
  }
}

/** Drena enrollments com step devido. Envia, loga e avanca. Idempotente por step. */
export async function processNurtureTick(batchSize = 50): Promise<{ processed: number; sent: number; failed: number }> {
  const now = new Date()
  const due = await prisma.nurtureEnrollment.findMany({
    where: { status: 'ACTIVE', nextStepAt: { lte: now } },
    take: batchSize,
    include: { sequence: { include: { steps: { orderBy: { order: 'asc' } } } } },
  })

  let sent = 0
  let failed = 0

  for (const enr of due) {
    const steps = enr.sequence.steps
    const step = steps.find((s) => s.order === enr.currentStep)
    if (!step) {
      await prisma.nurtureEnrollment.update({ where: { id: enr.id }, data: { status: 'COMPLETED', completedAt: now, nextStepAt: null } })
      continue
    }

    const sub = await prisma.emailSubscriber.findUnique({ where: { id: enr.subscriberId } })
    if (!sub || sub.status !== 'CONFIRMED') {
      // subscriber descadastrado/bounced/sumiu -> cancela a sequencia (LGPD: nao insiste)
      await prisma.nurtureEnrollment.update({ where: { id: enr.id }, data: { status: 'CANCELED', nextStepAt: null } })
      await prisma.nurtureSendLog.create({ data: { enrollmentId: enr.id, stepOrder: enr.currentStep, status: 'SKIPPED', detail: `subscriber_${sub?.status?.toLowerCase() ?? 'missing'}` } }).catch(() => undefined)
      continue
    }

    const email = decryptSubscriberEmail(sub.encryptedEmail)
    let ok = false
    let detail: string | null = null
    if (!email) {
      detail = 'decrypt_failed'
    } else {
      const unsubscribeUrl = buildUnsubscribeUrl(mintSubscriberToken(sub.id, 'unsubscribe'))
      const html = injectUnsubscribe(step.bodyHtml, unsubscribeUrl)
      const res = await sendMarketingEmail({ to: email, subject: step.subject, html, unsubscribeUrl })
      ok = res.ok
      detail = res.ok ? null : (res.error ?? 'unknown').slice(0, 500)
    }

    await prisma.nurtureSendLog.create({ data: { enrollmentId: enr.id, stepOrder: enr.currentStep, status: ok ? 'SENT' : 'FAILED', detail } }).catch(() => undefined)
    if (ok) sent++
    else failed++

    // Avanca de qualquer forma (evita loop preso; falha fica logada).
    const nextStep = steps.find((s) => s.order === enr.currentStep + 1)
    if (nextStep) {
      await prisma.nurtureEnrollment.update({ where: { id: enr.id }, data: { currentStep: enr.currentStep + 1, nextStepAt: new Date(now.getTime() + nextStep.delayHours * HOUR_MS) } })
    } else {
      await prisma.nurtureEnrollment.update({ where: { id: enr.id }, data: { status: 'COMPLETED', completedAt: now, nextStepAt: null } })
    }
  }

  return { processed: due.length, sent, failed }
}
