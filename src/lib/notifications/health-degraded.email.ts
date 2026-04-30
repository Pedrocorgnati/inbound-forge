/**
 * NOTIF-health-degraded: Email ao detectar worker em estado OFFLINE
 * Rastreabilidade: TASK-9/ST002, F-026, NOTIFICATION-SPEC canal email
 * Complementa sendWorkerDownAlert (NOTIF-001) — wrapper para o heartbeat handler.
 *
 * Catch silencioso — falha no email nunca bloqueia a feature principal.
 * Enviado de forma assíncrona (void) no route handler.
 */
import { sendWorkerDownAlert } from '@/lib/alert-email'

interface HealthDegradedParams {
  workerType: string
  status: string
  lastHeartbeat: Date
  errorMessage?: string | null
}

export async function sendHealthDegradedEmail(params: HealthDegradedParams): Promise<void> {
  const { workerType, errorMessage } = params
  await sendWorkerDownAlert(workerType, errorMessage ?? undefined)
}
