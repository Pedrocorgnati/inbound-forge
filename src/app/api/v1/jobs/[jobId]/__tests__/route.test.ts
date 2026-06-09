/**
 * TAREFA-017 — testes do endpoint universal /api/v1/jobs/[jobId].
 * Mock de sessao + registry. Cobre GET (happy/404/503/401) e DELETE (202/200/409/404/401).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { mockRequireSession, mockGetJobStatus, mockRequestCancellation } = vi.hoisted(() => ({
  mockRequireSession: vi.fn(),
  mockGetJobStatus: vi.fn(),
  mockRequestCancellation: vi.fn(),
}))

vi.mock('@/lib/api-auth', () => ({
  requireSession: mockRequireSession,
}))

// Mantemos as classes de erro reais para o instanceof do route bater.
vi.mock('@/lib/jobs/registry', async () => {
  const actual = await vi.importActual<typeof import('@/lib/jobs/registry')>('@/lib/jobs/registry')
  return {
    ...actual,
    getJobStatus: mockGetJobStatus,
    requestCancellation: mockRequestCancellation,
  }
})

// O DELETE embrulha o handler em withIdempotency (TAREFA-019), que consulta o
// store backed por Redis. Em teste nao ha Redis: mockamos o store para sempre
// abrir o caminho 'started' (executa o handler) sem cachear nada. Os testes aqui
// exercitam a semantica do DELETE (202/200/409/404), nao a idempotencia em si.
vi.mock('@/lib/idempotency/store', async () => {
  const actual = await vi.importActual<typeof import('@/lib/idempotency/store')>('@/lib/idempotency/store')
  return {
    ...actual,
    begin: vi.fn().mockResolvedValue({ state: 'started' }),
    complete: vi.fn().mockResolvedValue(undefined),
    release: vi.fn().mockResolvedValue(undefined),
  }
})

import { GET, DELETE } from '../route'
import {
  JobNotFoundError,
  JobTerminalError,
  JobRegistryUnavailableError,
} from '@/lib/jobs/registry'

const JOB_ID = 'job-xyz'

function authed() {
  mockRequireSession.mockResolvedValue({ user: { id: 'u1', email: 't@e.com' }, response: null })
}
function unauthed() {
  mockRequireSession.mockResolvedValue({
    user: null,
    response: new Response(JSON.stringify({ success: false, error: 'Não autorizado' }), { status: 401 }),
  })
}

function ctx() {
  return { params: Promise.resolve({ jobId: JOB_ID }) }
}
// UUID v7 valido para satisfazer o contrato de Idempotency-Key do DELETE.
const IDEMPOTENCY_KEY = '0190b6a0-0000-7000-8000-000000000000'
function req(method: string) {
  const headers = method === 'DELETE' ? { 'Idempotency-Key': IDEMPOTENCY_KEY } : undefined
  return new NextRequest(`http://localhost/api/v1/jobs/${JOB_ID}`, { method, headers })
}

beforeEach(() => {
  vi.clearAllMocks()
  authed()
})

describe('GET /api/v1/jobs/[jobId]', () => {
  it('200 com shape completo no happy path', async () => {
    mockGetJobStatus.mockResolvedValue({
      job_id: JOB_ID,
      kind: 'worker',
      status: 'running',
      progress: 42,
      started_at: '2026-05-31T10:00:00.000Z',
      finished_at: null,
      error_code: null,
      correlation_id: JOB_ID,
      cancellation_requested: false,
    })
    const res = await GET(req('GET'), ctx())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({
      status: 'running',
      progress: 42,
      started_at: '2026-05-31T10:00:00.000Z',
      finished_at: null,
      error_code: null,
      correlation_id: JOB_ID,
      cancellation_requested: false,
    })
  })

  it('401 quando sessao ausente, com corpo tipado', async () => {
    unauthed()
    const res = await GET(req('GET'), ctx())
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error_code).toBe('JOB_401')
    expect(body.correlation_id).toBe(JOB_ID)
  })

  it('404 tipado quando job inexistente', async () => {
    mockGetJobStatus.mockRejectedValue(new JobNotFoundError(JOB_ID))
    const res = await GET(req('GET'), ctx())
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error_code).toBe('JOB_404')
  })

  it('503 tipado quando registry indisponivel', async () => {
    mockGetJobStatus.mockRejectedValue(new JobRegistryUnavailableError())
    const res = await GET(req('GET'), ctx())
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error_code).toBe('JOB_503')
  })
})

describe('DELETE /api/v1/jobs/[jobId]', () => {
  it('202 quando cancelamento e solicitado nesta chamada', async () => {
    mockRequestCancellation.mockResolvedValue({ alreadyRequested: false, status: 'running' })
    const res = await DELETE(req('DELETE'), ctx())
    expect(res.status).toBe(202)
    const body = await res.json()
    expect(body.status).toBe('cancellation_requested')
    expect(body.job_status).toBe('running')
  })

  it('200 quando job ja estava em cancellation_requested (idempotente)', async () => {
    mockRequestCancellation.mockResolvedValue({ alreadyRequested: true, status: 'running' })
    const res = await DELETE(req('DELETE'), ctx())
    expect(res.status).toBe(200)
  })

  it('409 tipado quando job ja esta terminal', async () => {
    mockRequestCancellation.mockRejectedValue(new JobTerminalError(JOB_ID, 'done'))
    const res = await DELETE(req('DELETE'), ctx())
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error_code).toBe('JOB_409')
    expect(body.status).toBe('done')
  })

  it('404 tipado quando job inexistente', async () => {
    mockRequestCancellation.mockRejectedValue(new JobNotFoundError(JOB_ID))
    const res = await DELETE(req('DELETE'), ctx())
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error_code).toBe('JOB_404')
  })

  it('401 quando sessao ausente', async () => {
    unauthed()
    const res = await DELETE(req('DELETE'), ctx())
    expect(res.status).toBe(401)
  })
})
