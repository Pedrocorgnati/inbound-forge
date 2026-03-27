/**
 * Worker Client — Comunicação com Workers Railway
 * Criado por: /review-executed-module (TASK-4/ST002)
 *
 * Helper para comunicação com workers Railway via Bearer token.
 * Usado pelos modules 6 (scraping), 9 (image), 12 (publishing).
 */

const WORKER_BASE_URL = process.env.WORKER_BASE_URL ?? 'http://localhost:3001'
const WORKER_AUTH_TOKEN = process.env.WORKER_AUTH_TOKEN

type WorkerType = 'scraping' | 'image' | 'publishing'

interface WorkerResponse<T = unknown> {
  ok: boolean
  data?: T
  error?: string
}

async function workerFetch<T = unknown>(
  path: string,
  options?: RequestInit
): Promise<WorkerResponse<T>> {
  if (!WORKER_AUTH_TOKEN) {
    return { ok: false, error: 'WORKER_AUTH_TOKEN not configured' }
  }

  try {
    const res = await fetch(`${WORKER_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${WORKER_AUTH_TOKEN}`,
        ...options?.headers,
      },
    })

    if (!res.ok) {
      return { ok: false, error: `Worker responded ${res.status}` }
    }

    const data = (await res.json()) as T
    return { ok: true, data }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[WORKER] Request failed: ${path}`, message)
    return { ok: false, error: message }
  }
}

export async function triggerWorker(
  type: WorkerType,
  payload: Record<string, unknown>
): Promise<WorkerResponse> {
  return workerFetch(`/api/workers/${type}/trigger`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getWorkerStatus(
  type: WorkerType
): Promise<WorkerResponse<{ status: string; lastHeartbeat: string }>> {
  return workerFetch(`/api/workers/${type}/status`)
}

export async function pingWorker(): Promise<WorkerResponse<{ pong: boolean }>> {
  return workerFetch('/health')
}
