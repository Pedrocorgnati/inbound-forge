// TASK-2 ST003 (CL-224): envia email de teste para o destinatario configurado
// em SystemSetting.alertsEmail (fallback: ALERT_EMAIL_TO). Rate-limit 1/min/operador.

import { redis } from '@/lib/redis'
import { requireSession, ok, internalError } from '@/lib/api-auth'
import { NextResponse } from 'next/server'
import { sendAlertEmail } from '@/lib/alert-email'
import { getAlertsEmail } from '@/lib/settings/system-settings'

const RATE_WINDOW_SECONDS = 60

export async function POST() {
  const { user, response } = await requireSession()
  if (response) return response

  const key = `ratelimit:alerts-test:${user!.id}`
  try {
    const count = await redis.incr(key)
    if (count === 1) {
      await redis.expire(key, RATE_WINDOW_SECONDS)
    }
    if (count > 1) {
      return NextResponse.json(
        { success: false, error: 'Aguarde antes de enviar outro teste (1 req/min).' },
        { status: 429, headers: { 'Retry-After': String(RATE_WINDOW_SECONDS) } },
      )
    }
  } catch {
    // Falha no rate-limit nao deve bloquear o envio; segue.
  }

  try {
    const to = await getAlertsEmail()
    const timestamp = new Date().toISOString()
    await sendAlertEmail({
      subject: 'Teste de alerta — Inbound Forge',
      body: [
        'Este e um email de teste enviado a partir das configuracoes do sistema.',
        '',
        `Destinatario configurado: ${to}`,
        `Timestamp: ${timestamp}`,
        `Operador: ${user!.email ?? user!.id}`,
        '',
        'Se voce recebeu esta mensagem, o canal de alertas esta funcional.',
      ].join('\n'),
      severity: 'INFO',
      logType: 'alerts_test',
    })
    return ok({ sentTo: to, at: timestamp })
  } catch {
    return internalError('Falha ao enviar email de teste.')
  }
}
