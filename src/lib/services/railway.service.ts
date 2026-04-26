// railway.service — wrapper minimo para redeploy via Railway GraphQL API (TASK-7 ST002)
// Rate-limit in-memory: 1 restart por worker a cada 2min.
// Env: RAILWAY_API_TOKEN, RAILWAY_SERVICE_{WORKER_UPPER}

const GRAPHQL_ENDPOINT = 'https://backboard.railway.app/graphql/v2'
const RATE_LIMIT_MS = 2 * 60 * 1000

export type WorkerId = 'scraping' | 'image' | 'video' | 'publishing'

const lastRestartAt = new Map<WorkerId, number>()

export class RailwayConfigError extends Error {
  constructor(msg: string) {
    super(msg)
    this.name = 'RailwayConfigError'
  }
}

export class RailwayRateLimitError extends Error {
  retryAfterMs: number
  constructor(retryAfterMs: number) {
    super(`Rate limit: aguarde ${Math.ceil(retryAfterMs / 1000)}s para reiniciar novamente.`)
    this.name = 'RailwayRateLimitError'
    this.retryAfterMs = retryAfterMs
  }
}

export class RailwayUnavailableError extends Error {
  constructor(msg: string) {
    super(msg)
    this.name = 'RailwayUnavailableError'
  }
}

function resolveServiceId(worker: WorkerId): string {
  const key = `RAILWAY_SERVICE_${worker.toUpperCase()}`
  const id = process.env[key]
  if (!id) throw new RailwayConfigError(`Env ${key} nao configurada.`)
  return id
}

export async function restartWorker(
  worker: WorkerId,
  now: number = Date.now(),
): Promise<{ ok: true; serviceId: string }> {
  const last = lastRestartAt.get(worker)
  if (last && now - last < RATE_LIMIT_MS) {
    throw new RailwayRateLimitError(RATE_LIMIT_MS - (now - last))
  }

  const token = process.env.RAILWAY_API_TOKEN
  if (!token) throw new RailwayConfigError('RAILWAY_API_TOKEN nao configurada.')

  const serviceId = resolveServiceId(worker)

  const query = `
    mutation Redeploy($serviceId: String!) {
      serviceInstanceRedeploy(serviceId: $serviceId)
    }
  `

  let res: Response
  try {
    res = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables: { serviceId } }),
    })
  } catch (err) {
    throw new RailwayUnavailableError(
      err instanceof Error ? err.message : 'Railway API indisponivel',
    )
  }

  if (!res.ok) {
    throw new RailwayUnavailableError(`Railway respondeu ${res.status}`)
  }

  const data = (await res.json().catch(() => ({}))) as { errors?: unknown }
  if (data.errors) {
    throw new RailwayUnavailableError('Railway retornou erro de GraphQL.')
  }

  lastRestartAt.set(worker, now)
  return { ok: true, serviceId }
}

export function getLastRestart(worker: WorkerId): number | undefined {
  return lastRestartAt.get(worker)
}
