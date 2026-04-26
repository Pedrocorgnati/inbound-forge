/**
 * Intake-Review TASK-7 ST003 (CL-183): smoke test do setup SMTP via Resend.
 * Valida que RESEND_API_KEY + ALERT_EMAIL_TO estao corretos enviando email de teste.
 *
 * Uso:
 *   RESEND_API_KEY=... ALERT_EMAIL_TO=ops@example.com pnpm tsx scripts/smoke-email.ts
 */
import { sendAlertEmail } from '@/lib/alert-email'

async function main() {
  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.ALERT_EMAIL_TO
  if (!apiKey || !to) {
    console.error('[smoke-email] Defina RESEND_API_KEY e ALERT_EMAIL_TO')
    process.exit(1)
  }

  console.log(`[smoke-email] Enviando para ${to}...`)
  const result = await sendAlertEmail({
    subject: '[SMOKE] Teste de alerta — Inbound Forge',
    body: [
      'Este e um email de teste enviado por scripts/smoke-email.ts.',
      `Timestamp: ${new Date().toISOString()}`,
      'Se voce recebeu, o setup SMTP esta funcional.',
    ].join('\n'),
    severity: 'INFO',
    logType: 'SMOKE_TEST',
    metadata: { source: 'smoke-email.ts' },
  })

  console.log('[smoke-email] resultado:', result)
  process.exit(0)
}

main().catch((err) => {
  console.error('[smoke-email] erro fatal:', err)
  process.exit(1)
})
