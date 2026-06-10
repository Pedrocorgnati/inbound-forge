// Inbound F1 — transporte de email MARKETING via Resend REST (mesmo padrao de
// src/lib/alert-email.ts, sem dependencia @resend/node). Canal separado dos alertas.
//
// LGPD/CAN-SPAM: FAIL-CLOSED — recusa enviar se o HTML nao contiver o link de
// unsubscribe. Sempre seta os headers List-Unsubscribe + List-Unsubscribe-Post
// (one-click, RFC 8058). NUNCA loga o destinatario (SEC-008).
import 'server-only'

export interface MarketingEmailParams {
  to: string
  subject: string
  html: string
  text?: string
  fromName?: string
  replyTo?: string
  unsubscribeUrl: string // OBRIGATORIO e DEVE aparecer no html
}

export interface MarketingSendResult {
  ok: boolean
  messageId?: string
  error?: string
  skipped?: boolean
}

function fromAddress(fromName?: string): string {
  const email = process.env.MARKETING_EMAIL_FROM ?? process.env.ALERT_EMAIL_FROM ?? 'news@inbound-forge.app'
  return fromName ? `${fromName} <${email}>` : email
}

export async function sendMarketingEmail(params: MarketingEmailParams): Promise<MarketingSendResult> {
  const { to, subject, html, text, fromName, replyTo, unsubscribeUrl } = params

  // FAIL-CLOSED LGPD: o corpo PRECISA conter o link de unsubscribe.
  if (!unsubscribeUrl || !html.includes(unsubscribeUrl)) {
    return { ok: false, skipped: true, error: 'unsubscribe_link_missing' }
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    // Sem chave: nao e erro fatal (dev/local) — sinaliza skip para o caller decidir.
    return { ok: false, skipped: true, error: 'resend_not_configured' }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress(fromName),
        to: [to],
        subject,
        html,
        ...(text ? { text } : {}),
        ...(replyTo ? { reply_to: replyTo } : {}),
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'unknown')
      // SEC-008: nao logar o destinatario
      return { ok: false, error: `resend_${response.status}: ${errorText.slice(0, 200)}` }
    }
    const data = (await response.json().catch(() => ({}))) as { id?: string }
    return { ok: true, messageId: data.id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown' }
  }
}
