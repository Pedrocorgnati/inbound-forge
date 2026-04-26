/**
 * Circuit breaker Redis — Inbound Forge
 * TASK-4 ST002 / CL-236
 *
 * Estados: closed -> open (apos 3 falhas em 60s) -> half-open (apos 30s) -> closed.
 * Singleton em modulo (reiniciado a cada cold start do servidor).
 */

type CircuitState = 'closed' | 'open' | 'half-open'

const FAILURE_THRESHOLD = 3
const WINDOW_MS = 60_000
const OPEN_DURATION_MS = 30_000

let state: CircuitState = 'closed'
let failureCount = 0
let windowStart = Date.now()
let openedAt = 0

function recordFailure(): void {
  const now = Date.now()
  if (now - windowStart > WINDOW_MS) {
    failureCount = 0
    windowStart = now
  }
  failureCount++
  if (failureCount >= FAILURE_THRESHOLD) {
    state = 'open'
    openedAt = now
    console.warn('[circuit-breaker] Redis circuit OPEN — fallback ativo')
  }
}

function checkHalfOpen(): void {
  if (state === 'open' && Date.now() - openedAt >= OPEN_DURATION_MS) {
    state = 'half-open'
    console.info('[circuit-breaker] Redis circuit HALF-OPEN — testando')
  }
}

export function getCircuitState(): CircuitState {
  checkHalfOpen()
  return state
}

export function isRedisAvailable(): boolean {
  return getCircuitState() !== 'open'
}

export async function withRedisFallback<T>(
  redisFn: () => Promise<T>,
  fallback: () => Promise<T>
): Promise<T> {
  checkHalfOpen()

  if (state === 'open') {
    return fallback()
  }

  try {
    const result = await redisFn()
    if (state === 'half-open') {
      state = 'closed'
      failureCount = 0
      console.info('[circuit-breaker] Redis circuit CLOSED — recuperado')
    }
    return result
  } catch {
    recordFailure()
    if (state === 'half-open') {
      state = 'open'
      openedAt = Date.now()
    }
    return fallback()
  }
}

export function resetCircuit(): void {
  state = 'closed'
  failureCount = 0
  windowStart = Date.now()
  openedAt = 0
}

export function _getCircuitMetrics() {
  return { state, failureCount, windowStart, openedAt }
}
