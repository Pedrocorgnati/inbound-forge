/**
 * TAREFA-018: Tipos do enumerador de jobs consumido pelos canais SSE jobs/queue.
 *
 * `JobRecord` e a projecao minima que o stream precisa (id + status universal +
 * progresso + timestamp). Reusa `UniversalJobStatus` de TAREFA-017.
 */
import type { UniversalJobStatus } from '@/constants/status'

export interface JobRecord {
  id: string
  status: UniversalJobStatus
  progress: number | null
  /** ISO 8601 da ultima atualizacao; usado para diffs por tick. */
  updatedAt: string
}

export interface ListJobsParams {
  operatorId: string
  limit?: number
}

export interface ListJobsResult {
  items: JobRecord[]
}
