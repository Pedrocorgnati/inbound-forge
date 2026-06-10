/**
 * TAREFA-018: Enumerador de jobs por operador (consumido pelos canais SSE
 * jobs/queue via snapshot inicial + diff por tick).
 *
 * LIMITACAO DE SCHEMA (Zero Assumido): as tabelas de job atuais
 * (`worker_jobs`, `image_jobs`, `video_jobs`) NAO possuem coluna de operador
 * (`operator_id`), nem `content_pieces` (que referencia image/video jobs) e
 * scopeada por operador. Logo NAO existe um caminho de filtragem por operador
 * confiavel no modelo de dados atual.
 *
 * Decisao (operador, 2026-05-31): enumeracao per-operador retorna lista VAZIA
 * em vez de enumerar globalmente. Enumerar todos os jobs sob um `operatorId`
 * vazaria jobs entre tenants (regressao do tipo que reprovou TAREFA-008/013).
 * Os canais SSE jobs/queue permanecem vivos via heartbeat + `publish()` ao vivo
 * (que carrega o `operatorId` do produtor); apenas o snapshot/diff derivado do
 * store fica vazio ate o schema ganhar `operator_id` nas tabelas de job.
 *
 * Quando `operator_id` for adicionado: trocar o corpo de `listJobs` por uma
 * consulta Prisma real (filtrada por operador, ordenada por `updatedAt` desc,
 * limitada por `limit`) mapeando o status interno para `UniversalJobStatus` via
 * o mesmo vocabulario de `@/lib/jobs/registry`. A assinatura ja esta pronta.
 */
import type { ListJobsParams, ListJobsResult } from './types'

/** Default de `limit` (alinhado ao MAX_SCAN dos routes jobs/queue). */
export const DEFAULT_LIST_LIMIT = 200

export async function listJobs(_params: ListJobsParams): Promise<ListJobsResult> {
  // Enumeracao per-operador nao suportada pelo schema atual (ver cabecalho).
  // Retorno vazio e a unica resposta honesta e sem vazamento cross-tenant.
  return { items: [] }
}

export type { JobRecord, ListJobsParams, ListJobsResult } from './types'
