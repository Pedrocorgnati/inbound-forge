/**
 * TAREFA-017: Registry universal de jobs.
 *
 * Consolida sob um unico `job_id` os jobs persistidos pelas tres familias de
 * worker ja existentes no workspace — WorkerJob (fila generica), ImageJob e
 * VideoJob — expondo um contrato de status estavel para o endpoint universal
 * `/api/v1/jobs/[jobId]` (GET status + DELETE cancel).
 *
 * NAO recria persistencia: os jobs continuam vivendo nas suas tabelas Prisma.
 * O registry apenas (a) localiza o job por id entre as tabelas, (b) normaliza
 * o status interno para o vocabulario universal `queued|running|done|failed|
 * cancelled`, e (c) aplica um overlay de cancelamento em Redis (cancel-request
 * + cancelled), evitando uma migracao cross-tabela. O worker le a flag de
 * cancelamento no proximo checkpoint (`isCancellationRequested`) e, ao abortar
 * de forma limpa, marca o job como cancelado (`markCancelled`).
 *
 * Compatibilidade backward: os endpoints legados por-tipo (image-jobs,
 * video-jobs, health/jobs) continuam funcionando — esta camada e aditiva.
 */
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { REDIS_KEYS } from '@/constants/redis-keys'
import {
  UNIVERSAL_JOB_STATUS,
  UNIVERSAL_JOB_TERMINAL,
  type UniversalJobStatus,
} from '@/constants/status'

// ─── Constantes ─────────────────────────────────────────────────────────────

/** Familias de job consolidadas sob o job_id universal. */
export const JOB_KIND = {
  WORKER: 'worker',
  IMAGE: 'image',
  VIDEO: 'video',
} as const

export type JobKind = (typeof JOB_KIND)[keyof typeof JOB_KIND]

/** Codigos de erro tipados expostos pelo endpoint universal. */
export const JOB_ERROR_CODES = {
  NOT_FOUND: 'JOB_404',
  TERMINAL: 'JOB_409',
  UNAUTHORIZED: 'JOB_401',
  UNAVAILABLE: 'JOB_503',
} as const

/** error_code derivado quando o job esta em estado de falha (DB sem codigo proprio). */
const FAILURE_ERROR_CODE = {
  DEAD_LETTER: 'JOB_DEAD_LETTER',
  FAILED: 'JOB_FAILED',
} as const

/** Retries de leitura transitoria antes de declarar registry indisponivel (503). */
const READ_RETRY_MAX = 2
const READ_RETRY_BACKOFF_MS = 50

/** TTL do overlay de controle em Redis (7 dias) — cobre a vida util de um job. */
const JOB_CONTROL_TTL_SECONDS = 7 * 24 * 60 * 60

// ─── Erros tipados ────────────────────────────────────────────────────────────

export class JobNotFoundError extends Error {
  readonly code = JOB_ERROR_CODES.NOT_FOUND
  constructor(public readonly jobId: string) {
    super(`Job nao encontrado: ${jobId}`)
    this.name = 'JobNotFoundError'
  }
}

export class JobTerminalError extends Error {
  readonly code = JOB_ERROR_CODES.TERMINAL
  constructor(
    public readonly jobId: string,
    public readonly status: UniversalJobStatus,
  ) {
    super(`Job ${jobId} ja esta em estado terminal (${status}); cancelamento nao aplicavel`)
    this.name = 'JobTerminalError'
  }
}

export class JobRegistryUnavailableError extends Error {
  readonly code = JOB_ERROR_CODES.UNAVAILABLE
  constructor(public readonly cause?: unknown) {
    super('Registry de jobs temporariamente indisponivel')
    this.name = 'JobRegistryUnavailableError'
  }
}

// ─── Tipos publicos ─────────────────────────────────────────────────────────

export interface JobStatusView {
  job_id: string
  kind: JobKind
  /** Vocabulario universal: queued|running|done|failed|cancelled. */
  status: UniversalJobStatus
  /** 0..100, ou null quando o produtor nao reporta progresso granular. */
  progress: number | null
  /** ISO 8601 ou null. */
  started_at: string | null
  /** ISO 8601 ou null. */
  finished_at: string | null
  /** Codigo de erro tipado quando status === failed; null caso contrario. */
  error_code: string | null
  /** Handle de rastreio do job universal (== job_id). */
  correlation_id: string
  /** True quando ja existe um pedido de cancelamento pendente no overlay. */
  cancellation_requested: boolean
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Executa uma leitura tolerando falha transitoria (ate READ_RETRY_MAX retries
 * com backoff curto). Esgotadas as tentativas, lanca JobRegistryUnavailableError
 * (mapeado para 503). NAO mascara JobNotFoundError — `resolveJob` sinaliza
 * ausencia retornando null, nunca lancando.
 */
async function withReadRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= READ_RETRY_MAX; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt < READ_RETRY_MAX) {
        await sleep(READ_RETRY_BACKOFF_MS * (attempt + 1))
      }
    }
  }
  throw new JobRegistryUnavailableError(lastError)
}

interface ResolvedJob {
  kind: JobKind
  rawStatus: string
  startedAt: Date | null
  completedAt: Date | null
}

/**
 * Mapeia status interno (WorkerJobStatus | string de image/video) para o
 * vocabulario universal. cancellation_requested NAO altera o status aqui — so
 * o overlay `cancelled` (marcado pelo worker) projeta `cancelled`.
 */
function toUniversalStatus(rawStatus: string): UniversalJobStatus {
  switch (rawStatus) {
    case 'PENDING':
      return UNIVERSAL_JOB_STATUS.QUEUED
    case 'RUNNING':
    case 'PROCESSING':
      return UNIVERSAL_JOB_STATUS.RUNNING
    case 'COMPLETED':
    case 'DONE':
      return UNIVERSAL_JOB_STATUS.DONE
    case 'CANCELLED':
      // ImageJob/VideoJob (status String livre) podem ser cancelados pelos
      // endpoints legados por-tipo (ex: /api/v1/images/[jobId]/cancel grava
      // status='CANCELLED'). Sem este case o job legado-cancelado seria
      // reportado como failed/JOB_FAILED — regressao de backward-compat.
      return UNIVERSAL_JOB_STATUS.CANCELLED
    case 'FAILED':
    case 'DEAD_LETTER':
      return UNIVERSAL_JOB_STATUS.FAILED
    default:
      // Status interno desconhecido: tratado como falha tipada (Zero Estados
      // Indefinidos) em vez de propagar uma string fora do contrato.
      return UNIVERSAL_JOB_STATUS.FAILED
  }
}

function toErrorCode(rawStatus: string, universal: UniversalJobStatus): string | null {
  if (universal !== UNIVERSAL_JOB_STATUS.FAILED) return null
  return rawStatus === 'DEAD_LETTER'
    ? FAILURE_ERROR_CODE.DEAD_LETTER
    : FAILURE_ERROR_CODE.FAILED
}

/**
 * Localiza o job entre as tres tabelas. Ids sao UUID (globalmente unicos), logo
 * no maximo um match. Retorna null quando nenhuma tabela contem o id (sem throw).
 */
async function resolveJob(jobId: string): Promise<ResolvedJob | null> {
  const [worker, image, video] = await Promise.all([
    prisma.workerJob.findUnique({
      where: { id: jobId },
      select: { id: true, status: true, startedAt: true, completedAt: true },
    }),
    prisma.imageJob.findUnique({
      where: { id: jobId },
      select: { id: true, status: true, completedAt: true },
    }),
    prisma.videoJob.findUnique({
      where: { id: jobId },
      select: { id: true, status: true, completedAt: true },
    }),
  ])

  if (worker) {
    return {
      kind: JOB_KIND.WORKER,
      rawStatus: worker.status,
      startedAt: worker.startedAt ?? null,
      completedAt: worker.completedAt ?? null,
    }
  }
  if (image) {
    // ImageJob nao tem coluna startedAt; started_at fica null por design.
    return {
      kind: JOB_KIND.IMAGE,
      rawStatus: image.status,
      startedAt: null,
      completedAt: image.completedAt ?? null,
    }
  }
  if (video) {
    return {
      kind: JOB_KIND.VIDEO,
      rawStatus: video.status,
      startedAt: null,
      completedAt: video.completedAt ?? null,
    }
  }
  return null
}

interface ControlOverlay {
  cancelled: boolean
  cancelRequested: boolean
  progress: number | null
}

async function readOverlay(jobId: string): Promise<ControlOverlay> {
  const [cancelled, cancelRequested, progressRaw] = await Promise.all([
    redis.get(REDIS_KEYS.JOB_CANCELLED(jobId)),
    redis.get(REDIS_KEYS.JOB_CANCEL_REQUEST(jobId)),
    redis.get(REDIS_KEYS.JOB_PROGRESS(jobId)),
  ])

  let progress: number | null = null
  if (progressRaw !== null && progressRaw !== undefined) {
    const parsed = Number(progressRaw)
    if (Number.isFinite(parsed)) {
      progress = Math.min(100, Math.max(0, Math.round(parsed)))
    }
  }

  return {
    cancelled: Boolean(cancelled),
    cancelRequested: Boolean(cancelRequested),
    progress,
  }
}

// ─── API publica ──────────────────────────────────────────────────────────────

/**
 * Resolve a visao universal de status de um job.
 *
 * @throws JobNotFoundError quando o id nao existe em nenhuma tabela.
 * @throws JobRegistryUnavailableError quando a leitura falha apos retries.
 */
export async function getJobStatus(jobId: string): Promise<JobStatusView> {
  const resolved = await withReadRetry(() => resolveJob(jobId))
  if (!resolved) throw new JobNotFoundError(jobId)

  const overlay = await withReadRetry(() => readOverlay(jobId))

  let status = toUniversalStatus(resolved.rawStatus)
  // Overlay `cancelled` (marcado pelo worker) projeta o estado terminal cancelled,
  // exceto se o job ja terminou em done/failed antes do worker honrar o cancel.
  if (overlay.cancelled && !UNIVERSAL_JOB_TERMINAL.includes(status)) {
    status = UNIVERSAL_JOB_STATUS.CANCELLED
  }

  const error_code = toErrorCode(resolved.rawStatus, status)

  return {
    job_id: jobId,
    kind: resolved.kind,
    status,
    progress: overlay.progress,
    started_at: resolved.startedAt ? resolved.startedAt.toISOString() : null,
    finished_at: resolved.completedAt ? resolved.completedAt.toISOString() : null,
    error_code,
    correlation_id: jobId,
    cancellation_requested: overlay.cancelRequested,
  }
}

/**
 * Registra um pedido de cancelamento (guarda de transicao: so aplicavel enquanto
 * queued|running). Idempotente: chamadas repetidas detectam o pedido ja existente.
 *
 * @returns alreadyRequested=false na primeira marcacao (mapeia 202), true quando
 *          o pedido ja existia (mapeia 200).
 * @throws JobNotFoundError quando o id nao existe.
 * @throws JobTerminalError quando o job ja esta em done|failed|cancelled (409).
 * @throws JobRegistryUnavailableError em falha transitoria de leitura.
 */
export async function requestCancellation(
  jobId: string,
): Promise<{ alreadyRequested: boolean; status: UniversalJobStatus }> {
  const view = await getJobStatus(jobId)

  if (UNIVERSAL_JOB_TERMINAL.includes(view.status)) {
    throw new JobTerminalError(jobId, view.status)
  }

  if (view.cancellation_requested) {
    return { alreadyRequested: true, status: view.status }
  }

  // Mesma tolerancia a falha transitoria do caminho de leitura: uma falha de SET
  // esgotadas as tentativas vira JobRegistryUnavailableError (503 tipado), nunca
  // um 503 generico apos uma unica tentativa.
  await withReadRetry(() =>
    redis.set(REDIS_KEYS.JOB_CANCEL_REQUEST(jobId), '1', {
      ex: JOB_CONTROL_TTL_SECONDS,
    }),
  )
  return { alreadyRequested: false, status: view.status }
}

/**
 * Consumido pelo worker no proximo checkpoint para decidir se aborta a operacao
 * atual de forma limpa. Leitura simples (sem retry — o worker ja roda em loop).
 */
export async function isCancellationRequested(jobId: string): Promise<boolean> {
  const flag = await redis.get(REDIS_KEYS.JOB_CANCEL_REQUEST(jobId))
  return Boolean(flag)
}

/**
 * Marca o job como cancelado (estado terminal) apos o worker ter abortado de
 * forma limpa. Cancelamento e terminal: NAO reenfileira nem reinicia. A flag de
 * cancel-request e removida para refletir que o pedido foi honrado.
 */
export async function markCancelled(jobId: string): Promise<void> {
  await redis.set(REDIS_KEYS.JOB_CANCELLED(jobId), '1', {
    ex: JOB_CONTROL_TTL_SECONDS,
  })
  await redis.del(REDIS_KEYS.JOB_CANCEL_REQUEST(jobId))
}
