/**
 * TAREFA-018: Tipos de evento dos canais SSE.
 *
 * Define o vocabulario de payload de cada canal e o mapa canal -> evento
 * consumido por `createSSEStream<C>` (broker.ts) e pelos route handlers em
 * `src/app/api/sse/*`. Reusa `UniversalJobStatus` de TAREFA-017 para o canal
 * de jobs/queue (NUNCA redefine status inline).
 */
import type { UniversalJobStatus } from '@/constants/status'

/** Saude do servico. `probe()` no route emite isto no tick. */
export interface HealthEvent {
  status: 'ok' | 'degraded' | 'down'
  checkedAt: string
}

/** Transicao de ciclo de vida de um job (status universal de TAREFA-017). */
export interface JobEvent {
  jobId: string
  status: UniversalJobStatus
  progress: number | null
  updatedAt: string
}

/** Profundidade da fila derivada do job store. */
export interface QueueEvent {
  pending: number
  running: number
  failed: number
  at: string
}

/** Mudanca de estado de uma aprovacao (ancorada em TAREFA-010). */
export interface ApprovalEvent {
  approvalId: string
  state: string
  at: string
}

/** Notificacao push generica para o operador. */
export interface NotificationEvent {
  id: string
  kind: string
  title: string
  body?: string
  at: string
}

/** Mapa canal -> tipo de evento. Fonte unica da verdade dos canais SSE. */
export interface SSEChannelEventMap {
  approvals: ApprovalEvent
  health: HealthEvent
  jobs: JobEvent
  notifications: NotificationEvent
  queue: QueueEvent
}

export type SSEChannel = keyof SSEChannelEventMap

export type EventForChannel<C extends SSEChannel> = SSEChannelEventMap[C]
