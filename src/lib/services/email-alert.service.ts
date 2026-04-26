/**
 * Email Alert Service — Inbound Forge
 * TASK-4 ST005 / intake-review Sad Paths UI
 *
 * Serviço de alertas por email para falhas de worker (CL-131).
 * Usa Resend via alert-email.ts existente.
 * Debounce Redis: máximo 1 email por worker por hora.
 */
import { sendAlertEmail } from '@/lib/alert-email'
import { redis } from '@/lib/redis'

export type WorkerType = 'SCRAPING' | 'IMAGE' | 'PUBLISHING'

export interface WorkerAlertParams {
  workerType: WorkerType
  status: string
  errorMessage: string
  timestamp: Date
}

const DEBOUNCE_TTL = 60 * 60 // 1 hora em segundos

function debounceKey(workerType: WorkerType): string {
  return `email-alert:worker:${workerType}`
}

function buildWorkerAlertBody(params: WorkerAlertParams): string {
  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? ''
  const healthUrl = appUrl ? `${appUrl}/pt-BR/health` : '/health'

  return `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #b45309;">⚠️ Worker ${params.workerType} com falha</h2>
  <table style="border-collapse: collapse; width: 100%; margin-top: 16px;">
    <tr>
      <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold; background: #f9fafb;">Serviço</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb;">${params.workerType}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold; background: #f9fafb;">Status</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb; color: #dc2626;">${params.status}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold; background: #f9fafb;">Erro</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb; font-family: monospace; font-size: 13px;">${params.errorMessage}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold; background: #f9fafb;">Timestamp</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb;">${params.timestamp.toISOString()}</td>
    </tr>
  </table>
  <p style="margin-top: 24px;">
    <a href="${healthUrl}" style="background: #d97706; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold;">
      Ver Health Dashboard
    </a>
  </p>
</div>
`.trim()
}

/**
 * Envia email de alerta para falha de worker.
 * Debounce: máximo 1 email por worker por hora (via Redis).
 * Nunca lança exceção — falhas são logadas no console.
 */
export async function sendWorkerAlert(params: WorkerAlertParams): Promise<{ sent: boolean; reason?: string }> {
  const key = debounceKey(params.workerType)

  // Verificar debounce Redis
  try {
    const existing = await redis.get(key)
    if (existing) {
      return { sent: false, reason: 'Debounce ativo — já enviado na última hora' }
    }
  } catch {
    // Redis indisponível — enviar mesmo assim
  }

  try {
    await sendAlertEmail({
      subject: `⚠ Worker ${params.workerType} com falha — ${params.status}`,
      body: buildWorkerAlertBody(params),
      severity: 'ERROR',
      logType: 'worker_error',
      metadata: {
        workerType: params.workerType,
        status: params.status,
        timestamp: params.timestamp.toISOString(),
      },
    })

    // Registrar debounce Redis
    try {
      await redis.set(key, '1', { ex: DEBOUNCE_TTL })
    } catch {
      // Cache falhou — não bloquear
    }

    return { sent: true }
  } catch (err) {
    console.error('[EmailAlertService] Falha ao enviar alerta', err instanceof Error ? err.message : 'unknown')
    return { sent: false, reason: 'Falha no envio' }
  }
}

export interface WorkerSilentParams {
  workerType: WorkerType
  lastHeartbeat: Date
  silentMinutes: number
}

function buildWorkerSilentBody(params: WorkerSilentParams): string {
  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? ''
  const healthUrl = appUrl ? `${appUrl}/pt-BR/health` : '/health'

  return `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #b45309;">⚠️ Worker ${params.workerType} silencioso</h2>
  <p>O worker não envia heartbeat há <b>${params.silentMinutes} minutos</b>.</p>
  <table style="border-collapse: collapse; width: 100%; margin-top: 16px;">
    <tr>
      <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold; background: #f9fafb;">Worker</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb;">${params.workerType}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold; background: #f9fafb;">Último heartbeat</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb;">${params.lastHeartbeat.toISOString()}</td>
    </tr>
  </table>
  <p style="margin-top: 16px;">Verifique o processo e reinicie se necessário.</p>
  <p style="margin-top: 24px;">
    <a href="${healthUrl}" style="background: #d97706; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold;">
      Ver Health Dashboard
    </a>
  </p>
</div>
`.trim()
}

export async function sendWorkerSilent(params: WorkerSilentParams): Promise<{ sent: boolean; reason?: string }> {
  const key = `email-alert:worker-silent:${params.workerType}`

  try {
    const existing = await redis.get(key)
    if (existing) {
      return { sent: false, reason: 'Debounce ativo — já enviado na última hora' }
    }
  } catch {
    // Redis indisponível — enviar mesmo assim
  }

  try {
    await sendAlertEmail({
      subject: `⚠ Worker ${params.workerType} silencioso há ${params.silentMinutes}min`,
      body: buildWorkerSilentBody(params),
      severity: 'ERROR',
      logType: 'worker_silent',
      metadata: {
        workerType: params.workerType,
        lastHeartbeat: params.lastHeartbeat.toISOString(),
        silentMinutes: params.silentMinutes,
      },
    })

    try {
      await redis.set(key, '1', { ex: DEBOUNCE_TTL })
    } catch {}

    return { sent: true }
  } catch (err) {
    console.error('[EmailAlertService] Falha ao enviar workerSilent', err instanceof Error ? err.message : 'unknown')
    return { sent: false, reason: 'Falha no envio' }
  }
}
