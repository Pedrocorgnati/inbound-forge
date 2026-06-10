/**
 * Alert Service — Inbound Forge
 * TASK-1 ST002b / module-6-scraping-worker
 *
 * Gerencia criação, resolução e consulta de AlertLogs.
 * NOTIF-001: worker_down_alert.
 * SEC-008: sem dados de conteúdo em logs.
 */
import { prisma } from '@/lib/prisma'
import { dispatchAlert } from '@/lib/alerts/dispatcher'

export interface AlertSummary {
  id: string
  type: string
  severity: string
  message: string
  resolved: boolean
  resolvedAt: Date | null
  createdAt: Date
}

/**
 * Cria um alerta se não existir um aberto do mesmo tipo.
 * Idempotente — não cria duplicatas para a mesma janela de downtime.
 */
export async function createAlertIfAbsent(params: {
  type: string
  severity: string
  message: string
}): Promise<AlertSummary | null> {
  const existing = await prisma.alertLog.findFirst({
    where: { type: params.type, resolved: false },
  })

  if (existing) return null // Já existe alerta aberto

  const alert = await prisma.alertLog.create({
    data: {
      type: params.type,
      severity: params.severity,
      message: params.message,
      resolved: false,
    },
  })

  console.warn(`[AlertService] Alert created | type=${params.type} | id=${alert.id}`)
  // TASK-4 ST005: dispatch para canais externos
  dispatchAlert({ id: alert.id, type: alert.type, severity: alert.severity, message: alert.message }).catch(
    (err) => console.warn('[AlertService] dispatch error:', err),
  )
  return alert
}

/**
 * Resolve todos os alertas abertos de um determinado tipo.
 */
export async function resolveAlerts(type: string): Promise<number> {
  const result = await prisma.alertLog.updateMany({
    where: { type, resolved: false },
    data: { resolved: true, resolvedAt: new Date() },
  })

  if (result.count > 0) {
    console.info(`[AlertService] Resolved ${result.count} alert(s) | type=${type}`)
  }

  return result.count
}

/**
 * Lista alertas abertos (não resolvidos).
 */
export async function listOpenAlerts(): Promise<AlertSummary[]> {
  return prisma.alertLog.findMany({
    where: { resolved: false },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
}
