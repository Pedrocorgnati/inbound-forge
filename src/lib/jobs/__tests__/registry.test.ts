/**
 * TAREFA-017 — testes unit (mocked prisma + redis) do registry universal de jobs.
 * Cobre: resolucao cross-tabela, mapeamento de status, overlay de cancelamento,
 * guarda de transicao, idempotencia do cancel e tolerancia a falha transitoria.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockWorkerFind, mockImageFind, mockVideoFind, mockRedisGet, mockRedisSet, mockRedisDel } =
  vi.hoisted(() => ({
    mockWorkerFind: vi.fn(),
    mockImageFind: vi.fn(),
    mockVideoFind: vi.fn(),
    mockRedisGet: vi.fn(),
    mockRedisSet: vi.fn(),
    mockRedisDel: vi.fn(),
  }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    workerJob: { findUnique: mockWorkerFind },
    imageJob: { findUnique: mockImageFind },
    videoJob: { findUnique: mockVideoFind },
  },
}))

vi.mock('@/lib/redis', () => ({
  redis: { get: mockRedisGet, set: mockRedisSet, del: mockRedisDel },
}))

import {
  getJobStatus,
  requestCancellation,
  isCancellationRequested,
  markCancelled,
  JobNotFoundError,
  JobTerminalError,
  JobRegistryUnavailableError,
} from '@/lib/jobs/registry'
import { REDIS_KEYS } from '@/constants/redis-keys'

const JOB_ID = 'job-abc'

/** Configura o overlay Redis lido por readOverlay (cancelled, cancel-request, progress). */
function setOverlay(opts: { cancelled?: boolean; cancelRequested?: boolean; progress?: string | null } = {}) {
  mockRedisGet.mockImplementation(async (key: string) => {
    if (key === REDIS_KEYS.JOB_CANCELLED(JOB_ID)) return opts.cancelled ? '1' : null
    if (key === REDIS_KEYS.JOB_CANCEL_REQUEST(JOB_ID)) return opts.cancelRequested ? '1' : null
    if (key === REDIS_KEYS.JOB_PROGRESS(JOB_ID)) return opts.progress ?? null
    return null
  })
}

function noJobInAnyTable() {
  mockWorkerFind.mockResolvedValue(null)
  mockImageFind.mockResolvedValue(null)
  mockVideoFind.mockResolvedValue(null)
}

beforeEach(() => {
  vi.clearAllMocks()
  noJobInAnyTable()
  setOverlay()
  mockRedisSet.mockResolvedValue('OK')
  mockRedisDel.mockResolvedValue(1)
})

describe('getJobStatus — mapeamento de status', () => {
  it('WorkerJob PENDING -> queued', async () => {
    mockWorkerFind.mockResolvedValue({ id: JOB_ID, status: 'PENDING', startedAt: null, completedAt: null })
    const view = await getJobStatus(JOB_ID)
    expect(view.status).toBe('queued')
    expect(view.kind).toBe('worker')
    expect(view.error_code).toBeNull()
    expect(view.correlation_id).toBe(JOB_ID)
  })

  it('WorkerJob RUNNING -> running com started_at ISO', async () => {
    const started = new Date('2026-05-31T10:00:00.000Z')
    mockWorkerFind.mockResolvedValue({ id: JOB_ID, status: 'RUNNING', startedAt: started, completedAt: null })
    const view = await getJobStatus(JOB_ID)
    expect(view.status).toBe('running')
    expect(view.started_at).toBe('2026-05-31T10:00:00.000Z')
    expect(view.finished_at).toBeNull()
  })

  it('WorkerJob COMPLETED -> done com finished_at ISO', async () => {
    const done = new Date('2026-05-31T11:00:00.000Z')
    mockWorkerFind.mockResolvedValue({ id: JOB_ID, status: 'COMPLETED', startedAt: null, completedAt: done })
    const view = await getJobStatus(JOB_ID)
    expect(view.status).toBe('done')
    expect(view.finished_at).toBe('2026-05-31T11:00:00.000Z')
  })

  it('WorkerJob FAILED -> failed com error_code JOB_FAILED', async () => {
    mockWorkerFind.mockResolvedValue({ id: JOB_ID, status: 'FAILED', startedAt: null, completedAt: null })
    const view = await getJobStatus(JOB_ID)
    expect(view.status).toBe('failed')
    expect(view.error_code).toBe('JOB_FAILED')
  })

  it('WorkerJob DEAD_LETTER -> failed com error_code JOB_DEAD_LETTER', async () => {
    mockWorkerFind.mockResolvedValue({ id: JOB_ID, status: 'DEAD_LETTER', startedAt: null, completedAt: null })
    const view = await getJobStatus(JOB_ID)
    expect(view.status).toBe('failed')
    expect(view.error_code).toBe('JOB_DEAD_LETTER')
  })

  it('ImageJob PROCESSING -> running, started_at null (sem coluna)', async () => {
    mockImageFind.mockResolvedValue({ id: JOB_ID, status: 'PROCESSING', completedAt: null })
    const view = await getJobStatus(JOB_ID)
    expect(view.status).toBe('running')
    expect(view.kind).toBe('image')
    expect(view.started_at).toBeNull()
  })

  it('VideoJob DONE -> done', async () => {
    mockVideoFind.mockResolvedValue({ id: JOB_ID, status: 'DONE', completedAt: new Date('2026-05-31T12:00:00.000Z') })
    const view = await getJobStatus(JOB_ID)
    expect(view.status).toBe('done')
    expect(view.kind).toBe('video')
  })

  it('ImageJob CANCELLED (cancel legado) -> cancelled, nao failed', async () => {
    // /api/v1/images/[jobId]/cancel grava status='CANCELLED' direto no DB.
    mockImageFind.mockResolvedValue({ id: JOB_ID, status: 'CANCELLED', completedAt: null })
    const view = await getJobStatus(JOB_ID)
    expect(view.status).toBe('cancelled')
    expect(view.kind).toBe('image')
    expect(view.error_code).toBeNull()
  })

  it('VideoJob CANCELLED -> cancelled', async () => {
    mockVideoFind.mockResolvedValue({ id: JOB_ID, status: 'CANCELLED', completedAt: null })
    const view = await getJobStatus(JOB_ID)
    expect(view.status).toBe('cancelled')
    expect(view.error_code).toBeNull()
  })
})

describe('getJobStatus — overlay e progresso', () => {
  it('overlay cancelled projeta cancelled quando underlying running', async () => {
    mockWorkerFind.mockResolvedValue({ id: JOB_ID, status: 'RUNNING', startedAt: null, completedAt: null })
    setOverlay({ cancelled: true })
    const view = await getJobStatus(JOB_ID)
    expect(view.status).toBe('cancelled')
  })

  it('overlay cancelled e ignorado quando underlying ja done', async () => {
    mockWorkerFind.mockResolvedValue({ id: JOB_ID, status: 'COMPLETED', startedAt: null, completedAt: null })
    setOverlay({ cancelled: true })
    const view = await getJobStatus(JOB_ID)
    expect(view.status).toBe('done')
  })

  it('cancellation_requested refletido no view', async () => {
    mockWorkerFind.mockResolvedValue({ id: JOB_ID, status: 'RUNNING', startedAt: null, completedAt: null })
    setOverlay({ cancelRequested: true })
    const view = await getJobStatus(JOB_ID)
    expect(view.cancellation_requested).toBe(true)
  })

  it('progress parseado e clampado em 0..100', async () => {
    mockWorkerFind.mockResolvedValue({ id: JOB_ID, status: 'RUNNING', startedAt: null, completedAt: null })
    setOverlay({ progress: '150' })
    const view = await getJobStatus(JOB_ID)
    expect(view.progress).toBe(100)
  })

  it('progress null quando ausente', async () => {
    mockWorkerFind.mockResolvedValue({ id: JOB_ID, status: 'RUNNING', startedAt: null, completedAt: null })
    const view = await getJobStatus(JOB_ID)
    expect(view.progress).toBeNull()
  })
})

describe('getJobStatus — erros', () => {
  it('lanca JobNotFoundError quando id ausente em todas as tabelas', async () => {
    await expect(getJobStatus(JOB_ID)).rejects.toBeInstanceOf(JobNotFoundError)
  })

  it('lanca JobRegistryUnavailableError apos esgotar retries de leitura', async () => {
    mockWorkerFind.mockRejectedValue(new Error('conn reset'))
    mockImageFind.mockRejectedValue(new Error('conn reset'))
    mockVideoFind.mockRejectedValue(new Error('conn reset'))
    await expect(getJobStatus(JOB_ID)).rejects.toBeInstanceOf(JobRegistryUnavailableError)
    // 1 tentativa + READ_RETRY_MAX(2) retries = 3 chamadas a cada findUnique
    expect(mockWorkerFind).toHaveBeenCalledTimes(3)
  })
})

describe('requestCancellation — guarda de transicao e idempotencia', () => {
  it('primeira marcacao retorna alreadyRequested=false e seta flag (202)', async () => {
    mockWorkerFind.mockResolvedValue({ id: JOB_ID, status: 'RUNNING', startedAt: null, completedAt: null })
    const res = await requestCancellation(JOB_ID)
    expect(res.alreadyRequested).toBe(false)
    expect(res.status).toBe('running')
    expect(mockRedisSet).toHaveBeenCalledWith(REDIS_KEYS.JOB_CANCEL_REQUEST(JOB_ID), '1', expect.objectContaining({ ex: expect.any(Number) }))
  })

  it('pedido repetido retorna alreadyRequested=true e nao re-seta (200)', async () => {
    mockWorkerFind.mockResolvedValue({ id: JOB_ID, status: 'RUNNING', startedAt: null, completedAt: null })
    setOverlay({ cancelRequested: true })
    const res = await requestCancellation(JOB_ID)
    expect(res.alreadyRequested).toBe(true)
    expect(mockRedisSet).not.toHaveBeenCalled()
  })

  it('lanca JobTerminalError quando job ja terminou (done) -> 409', async () => {
    mockWorkerFind.mockResolvedValue({ id: JOB_ID, status: 'COMPLETED', startedAt: null, completedAt: null })
    await expect(requestCancellation(JOB_ID)).rejects.toBeInstanceOf(JobTerminalError)
  })

  it('lanca JobTerminalError quando job ja falhou', async () => {
    mockWorkerFind.mockResolvedValue({ id: JOB_ID, status: 'FAILED', startedAt: null, completedAt: null })
    await expect(requestCancellation(JOB_ID)).rejects.toBeInstanceOf(JobTerminalError)
  })

  it('lanca JobNotFoundError quando job inexistente', async () => {
    await expect(requestCancellation(JOB_ID)).rejects.toBeInstanceOf(JobNotFoundError)
  })

  it('lanca JobTerminalError quando ImageJob ja foi cancelado via legado (CANCELLED)', async () => {
    mockImageFind.mockResolvedValue({ id: JOB_ID, status: 'CANCELLED', completedAt: null })
    await expect(requestCancellation(JOB_ID)).rejects.toBeInstanceOf(JobTerminalError)
  })

  it('tolera falha transitoria do SET (retry) antes de confirmar a marcacao', async () => {
    mockWorkerFind.mockResolvedValue({ id: JOB_ID, status: 'RUNNING', startedAt: null, completedAt: null })
    mockRedisSet.mockRejectedValueOnce(new Error('conn reset')).mockResolvedValue('OK')
    const res = await requestCancellation(JOB_ID)
    expect(res.alreadyRequested).toBe(false)
    expect(mockRedisSet).toHaveBeenCalledTimes(2)
  })

  it('SET esgotando retries vira JobRegistryUnavailableError (503)', async () => {
    mockWorkerFind.mockResolvedValue({ id: JOB_ID, status: 'RUNNING', startedAt: null, completedAt: null })
    mockRedisSet.mockRejectedValue(new Error('redis down'))
    await expect(requestCancellation(JOB_ID)).rejects.toBeInstanceOf(JobRegistryUnavailableError)
  })
})

describe('helpers de worker', () => {
  it('isCancellationRequested le a flag', async () => {
    setOverlay({ cancelRequested: true })
    expect(await isCancellationRequested(JOB_ID)).toBe(true)
  })

  it('markCancelled seta cancelled e remove cancel-request', async () => {
    await markCancelled(JOB_ID)
    expect(mockRedisSet).toHaveBeenCalledWith(REDIS_KEYS.JOB_CANCELLED(JOB_ID), '1', expect.objectContaining({ ex: expect.any(Number) }))
    expect(mockRedisDel).toHaveBeenCalledWith(REDIS_KEYS.JOB_CANCEL_REQUEST(JOB_ID))
  })
})
