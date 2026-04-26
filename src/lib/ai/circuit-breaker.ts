// Circuit breaker para providers externos (TASK-14 ST003 / CL-262)
// Conta falhas consecutivas por chave e abre o circuito apos `threshold` falhas.
// Enquanto aberto, skipa chamadas ate `cooldownMs` expirar ou ate reset manual.

import 'server-only'

interface BreakerState {
  failures: number
  openedAt: number | null
}

const DEFAULT_THRESHOLD = 5
const DEFAULT_COOLDOWN_MS = 5 * 60 * 1000 // 5 minutos

const breakers = new Map<string, BreakerState>()

export interface BreakerOptions {
  threshold?: number
  cooldownMs?: number
}

function getState(key: string): BreakerState {
  let state = breakers.get(key)
  if (!state) {
    state = { failures: 0, openedAt: null }
    breakers.set(key, state)
  }
  return state
}

export function isOpen(key: string, options: BreakerOptions = {}): boolean {
  const cooldown = options.cooldownMs ?? DEFAULT_COOLDOWN_MS
  const state = getState(key)
  if (state.openedAt === null) return false
  if (Date.now() - state.openedAt >= cooldown) {
    state.openedAt = null
    state.failures = 0
    return false
  }
  return true
}

export function recordSuccess(key: string): void {
  const state = getState(key)
  state.failures = 0
  state.openedAt = null
}

export function recordFailure(key: string, options: BreakerOptions = {}): void {
  const threshold = options.threshold ?? DEFAULT_THRESHOLD
  const state = getState(key)
  state.failures += 1
  if (state.failures >= threshold) {
    state.openedAt = Date.now()
  }
}

export function reset(key: string): void {
  breakers.delete(key)
}

export function snapshot(): Record<string, BreakerState> {
  return Object.fromEntries(breakers.entries())
}
