/**
 * src/lib/alert-email.ts
 * Rastreabilidade: INT-045, NOTIF-001, TASK-4/ST004
 * Sistema de alertas por email via Resend
 *
 * NOTIF-001: Worker em Estado de Erro
 * - Trigger: worker sem heartbeat > 30min OU WorkerHealth.errorMessage preenchido
 * - Canal: Email assíncrono (operador fora do dashboard)
 * - Assunto: "⚠ Worker {tipo} offline — ação necessária"
 * - AlertLog sempre criado no banco (independente do email)
 */
import { prisma } from '@/lib/prisma'
import { getAlertsEmail } from '@/lib/settings/system-settings'

export type AlertSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'

interface SendAlertEmailOptions {
  subject: string
  body: string
  severity?: AlertSeverity
  logType?: string
  metadata?: Record<string, unknown>
}

/**
 * Envia alerta por email via Resend e registra no banco (AlertLog)
 *
 * Se RESEND_API_KEY ou ALERT_EMAIL_TO não configurados:
 * - Emite console.warn (nunca lança exceção)
 * - AlertLog ainda é criado no banco
 *
 * @example // NOTIF-001 — Worker offline
 * await sendAlertEmail({
 *   subject: '⚠ Worker SCRAPING offline — ação necessária',
 *   body: buildWorkerDownBody('SCRAPING'),
 *   severity: 'CRITICAL',
 *   logType: 'worker_down',
 * })
 */
export async function sendAlertEmail(options: SendAlertEmailOptions): Promise<void> {
  const { subject, body, severity = 'ERROR', logType = 'alert', metadata: _metadata } = options

  // Criar AlertLog no banco (sempre — independente do email)
  try {
    await prisma.alertLog.create({
      data: {
        type: logType,
        severity,
        message: `${subject}\n\n${body}`,
        resolved: false,
      },
    })
  } catch (err) {
    console.error('[alert-email] Falha ao criar AlertLog:', err)
  }

  // Verificar configuração de email
  // TASK-8 ST002 (CL-293): ler email do DB com fallback para env.
  const resendApiKey = process.env.RESEND_API_KEY
  let alertEmailTo: string | undefined
  try {
    alertEmailTo = await getAlertsEmail()
  } catch {
    alertEmailTo = process.env.ALERT_EMAIL_TO
  }

  if (!resendApiKey || !alertEmailTo) {
    console.warn('[alert-email] Email alertas não configurados — pulando envio')
    return
  }

  // Enviar email via Resend API REST (evitar dependência @resend/node se não instalada)
  try {
    const fromEmail = process.env.ALERT_EMAIL_FROM ?? 'alertas@inbound-forge.app'

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [alertEmailTo],
        subject,
        html: `<pre style="font-family: monospace; white-space: pre-wrap;">${body}</pre>`,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'unknown')
      console.error(`[alert-email] Resend API error ${response.status}: ${errorText}`)
    }
  } catch (err) {
    // Nunca lançar exceção — alertas são best-effort
    console.error('[alert-email] Erro ao enviar email:', err)
  }
}

/**
 * NOTIF-001: Alerta de worker offline
 * Trigger: worker sem heartbeat > 30min OU com errorMessage
 */
export async function sendWorkerDownAlert(
  workerType: string,
  errorMessage?: string
): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.inbound-forge.app'
  const timestamp = new Date().toISOString()

  const body = [
    `Worker: ${workerType}`,
    `Timestamp: ${timestamp}`,
    `Erro: ${errorMessage ?? 'Heartbeat não recebido há > 30 minutos'}`,
    '',
    `Dashboard de saúde: ${baseUrl}/health`,
    '',
    'Ação necessária: verificar logs do worker e reiniciar se necessário.',
  ].join('\n')

  await sendAlertEmail({
    subject: `⚠ Worker ${workerType} offline — ação necessária`,
    body,
    severity: 'CRITICAL',
    logType: 'worker_down',
    metadata: { workerType, errorMessage, timestamp },
  })
}

/**
 * Alerta de custo de API próximo do limite
 */
export async function sendCostAlert(
  service: string,
  usagePercent: number,
  currentUsage: number,
  limit: number
): Promise<void> {
  const timestamp = new Date().toISOString()
  const isExceeded = usagePercent >= 1.0

  const body = [
    `Serviço: ${service}`,
    `Uso atual: ${currentUsage} / ${limit} (${Math.round(usagePercent * 100)}%)`,
    `Timestamp: ${timestamp}`,
    '',
    isExceeded
      ? 'ATENÇÃO: Limite excedido. Novas requisições podem ser bloqueadas.'
      : `Aviso: ${Math.round(usagePercent * 100)}% do limite atingido.`,
  ].join('\n')

  await sendAlertEmail({
    subject: isExceeded
      ? `🚨 Custo API ${service} — limite EXCEDIDO`
      : `⚠ Custo API ${service} próximo do limite (${Math.round(usagePercent * 100)}%)`,
    body,
    severity: isExceeded ? 'CRITICAL' : 'WARNING',
    logType: `cost_threshold:${service}`,
  })
}
