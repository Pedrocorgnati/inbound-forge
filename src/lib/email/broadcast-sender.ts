// Inbound F1 — envio de broadcasts em lotes (drenado pelo cron broadcast-sender).
// Promove SCHEDULED devidos -> SENDING, enfileira CONFIRMED, envia via Resend com
// footer de unsubscribe OBRIGATORIO por destinatario. SEC-008: sem PII em log.
import 'server-only'
import { prisma } from '@/lib/prisma'
import { sendMarketingEmail } from './marketing-send'
import { mintSubscriberToken } from './subscriber-token'
import { buildUnsubscribeUrl, decryptSubscriberEmail } from './subscriber'

const UNSUBSCRIBE_PLACEHOLDER = '{{unsubscribe}}'

/** Garante que o link de unsubscribe aparece no HTML (LGPD/CAN-SPAM). */
export function injectUnsubscribe(bodyHtml: string, unsubscribeUrl: string): string {
  const footer = `<hr style="margin-top:32px;border:none;border-top:1px solid #e2e8f0"/><p style="font-size:12px;color:#94a3b8;text-align:center;margin-top:12px">Voce recebe este email porque se inscreveu. <a href="${unsubscribeUrl}" style="color:#94a3b8">Descadastrar</a>.</p>`
  const withPlaceholder = bodyHtml.includes(UNSUBSCRIBE_PLACEHOLDER)
    ? bodyHtml.split(UNSUBSCRIBE_PLACEHOLDER).join(unsubscribeUrl)
    : bodyHtml
  return withPlaceholder + footer
}

/** Cria BroadcastRecipient (QUEUED) para todos os subscribers CONFIRMED e marca SENDING. */
export async function enqueueBroadcast(broadcastId: string): Promise<{ queued: number }> {
  const confirmed = await prisma.emailSubscriber.findMany({
    where: { status: 'CONFIRMED' },
    select: { id: true },
  })
  if (confirmed.length > 0) {
    await prisma.broadcastRecipient.createMany({
      data: confirmed.map((s) => ({ broadcastId, subscriberId: s.id })),
      skipDuplicates: true,
    })
  }
  await prisma.broadcast.update({
    where: { id: broadcastId },
    data: { status: 'SENDING', totalRecipients: confirmed.length },
  })
  return { queued: confirmed.length }
}

/**
 * Processa broadcasts: promove SCHEDULED devidos e envia lotes de SENDING.
 * Idempotente: cada recipient e enviado uma vez (status QUEUED -> SENT/FAILED/SKIPPED).
 */
export async function processSendingBroadcasts(batchSize = 50): Promise<{ processed: number; sent: number; failed: number }> {
  const now = new Date()
  let processed = 0
  let sent = 0
  let failed = 0

  // 1. Promover SCHEDULED devidos -> SENDING (enfileira)
  const due = await prisma.broadcast.findMany({
    where: { status: 'SCHEDULED', scheduledAt: { lte: now } },
    select: { id: true },
  })
  for (const b of due) {
    await enqueueBroadcast(b.id)
  }

  // 2. Processar SENDING em lotes
  const sending = await prisma.broadcast.findMany({
    where: { status: 'SENDING' },
    select: { id: true, subject: true, bodyHtml: true, bodyText: true, fromName: true, replyTo: true },
  })

  for (const b of sending) {
    const recipients = await prisma.broadcastRecipient.findMany({
      where: { broadcastId: b.id, status: 'QUEUED' },
      take: batchSize,
      include: { subscriber: true },
    })

    for (const r of recipients) {
      processed++
      const sub = r.subscriber
      if (sub.status !== 'CONFIRMED') {
        await prisma.broadcastRecipient.update({ where: { id: r.id }, data: { status: 'SKIPPED', lastError: `subscriber_${sub.status.toLowerCase()}` } })
        continue
      }
      const email = decryptSubscriberEmail(sub.encryptedEmail)
      if (!email) {
        await prisma.broadcastRecipient.update({ where: { id: r.id }, data: { status: 'FAILED', lastError: 'decrypt_failed' } })
        failed++
        continue
      }
      const unsubscribeUrl = buildUnsubscribeUrl(mintSubscriberToken(sub.id, 'unsubscribe'))
      const html = injectUnsubscribe(b.bodyHtml, unsubscribeUrl)
      const res = await sendMarketingEmail({
        to: email,
        subject: b.subject,
        html,
        text: b.bodyText ?? undefined,
        fromName: b.fromName ?? undefined,
        replyTo: b.replyTo ?? undefined,
        unsubscribeUrl,
      })
      if (res.ok) {
        await prisma.broadcastRecipient.update({ where: { id: r.id }, data: { status: 'SENT', sentAt: new Date(), resendMessageId: res.messageId ?? null } })
        sent++
      } else {
        await prisma.broadcastRecipient.update({ where: { id: r.id }, data: { status: 'FAILED', lastError: (res.error ?? 'unknown').slice(0, 500) } })
        failed++
      }
    }

    // Atualizar counters + concluir se nao ha mais QUEUED
    const [remaining, sentCount, failedCount] = await Promise.all([
      prisma.broadcastRecipient.count({ where: { broadcastId: b.id, status: 'QUEUED' } }),
      prisma.broadcastRecipient.count({ where: { broadcastId: b.id, status: 'SENT' } }),
      prisma.broadcastRecipient.count({ where: { broadcastId: b.id, status: 'FAILED' } }),
    ])
    await prisma.broadcast.update({
      where: { id: b.id },
      data: {
        sentCount,
        failedCount,
        ...(remaining === 0 ? { status: 'SENT' as const, sentAt: new Date() } : {}),
      },
    })
  }

  return { processed, sent, failed }
}
