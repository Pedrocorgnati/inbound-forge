/**
 * Notification Emitter Service — Intake Review TASK-11 ST003 (CL-245).
 *
 * Ponto unico de emissao de notificacoes in-app.
 * Integrar em: AlertLog handler, ActivationEvent, CostThreshold, ApprovalRequired.
 */
import { prisma } from '@/lib/prisma'

export type NotificationType =
  | 'ALERT_LOG'
  | 'ACTIVATION_EVENT'
  | 'COST_THRESHOLD'
  | 'APPROVAL_REQUIRED'
  | 'WORKER_SILENT'
  | 'SCRAPING_FAILURE'
  | 'GENERIC'

export interface EmitInput {
  type: NotificationType
  title: string
  body?: string | null
  link?: string | null
  sourceId?: string | null
  sourceType?: string | null
}

/**
 * Emite uma notificacao. Nao lanca — best-effort, loga erros.
 */
export async function emit(input: EmitInput): Promise<{ id: string } | null> {
  try {
    const created = await prisma.notification.create({
      data: {
        type: input.type,
        title: input.title.slice(0, 200),
        body: input.body ?? null,
        link: input.link ?? null,
        sourceId: input.sourceId ?? null,
        sourceType: input.sourceType ?? null,
      },
      select: { id: true },
    })
    return created
  } catch (err) {
    console.error('[notification-emitter.emit]', err)
    return null
  }
}

/**
 * Helper: emit a partir de um AlertLog existente.
 */
export async function emitFromAlertLog(alert: {
  id: string
  severity: string
  type: string
  message: string
}) {
  return emit({
    type: 'ALERT_LOG',
    title: `[${alert.severity}] ${alert.type}`,
    body: alert.message,
    sourceId: alert.id,
    sourceType: 'AlertLog',
  })
}

/**
 * Helper: emit quando cost threshold e ultrapassado.
 */
export async function emitCostThreshold(provider: string, amount: number, threshold: number) {
  return emit({
    type: 'COST_THRESHOLD',
    title: `Custo ${provider} acima do limite`,
    body: `Gasto atual: US$ ${amount.toFixed(2)} (limite US$ ${threshold.toFixed(2)}).`,
    link: '/analytics/cost',
    sourceType: 'CostLog',
  })
}

/**
 * Helper: emit quando uma aprovacao humana e requerida.
 */
export async function emitApprovalRequired(entity: string, entityId: string, link?: string) {
  return emit({
    type: 'APPROVAL_REQUIRED',
    title: `Aprovacao requerida: ${entity}`,
    body: `${entity} ${entityId} aguarda revisao humana.`,
    link: link ?? null,
    sourceId: entityId,
    sourceType: entity,
  })
}

/**
 * Helper: emit quando um worker fica silencioso (activation event inverso).
 */
export async function emitWorkerSilent(workerType: string, lastSeenMs: number) {
  const minutes = Math.round((Date.now() - lastSeenMs) / 60_000)
  return emit({
    type: 'WORKER_SILENT',
    title: `Worker ${workerType} silencioso`,
    body: `Sem heartbeat ha ${minutes} min.`,
    link: '/health',
    sourceId: workerType,
    sourceType: 'Worker',
  })
}
