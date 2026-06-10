/**
 * Rastreabilidade: CL-305, TASK-4 ST001
 * Canal email: envia alertas via Resend para OPERATIONS_EMAIL.
 */

export async function sendEmailAlert(alert: {
  type: string
  severity: string
  message: string
  id?: string
}): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY
  const toEmail = process.env.OPERATIONS_EMAIL

  if (!resendApiKey || !toEmail) {
    console.warn('[alerts/email] RESEND_API_KEY ou OPERATIONS_EMAIL não configurado — skip')
    return
  }

  const subject = `[${alert.severity.toUpperCase()}] Alerta operacional: ${alert.type}`
  const html = `
    <h2>[${alert.severity.toUpperCase()}] ${alert.type}</h2>
    <p>${alert.message.replace(/\n/g, '<br>')}</p>
    ${alert.id ? `<p><small>ID: ${alert.id}</small></p>` : ''}
    <hr>
    <p><small>Inbound Forge — alertas operacionais</small></p>
  `

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.ALERT_EMAIL_FROM ?? 'alerts@inboundforge.app',
      to: [toEmail],
      subject,
      html,
    }),
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Resend falhou (${res.status}): ${body}`)
  }
}
