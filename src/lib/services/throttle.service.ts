// Throttle service — rolling window em memoria (TASK-11 ST003 / CL-054)
// Uso: enforce limite por chave dentro de uma janela em segundos.

type Hits = number[]
const buckets = new Map<string, Hits>()

function pruneAndCount(key: string, now: number, windowMs: number): number {
  const hits = buckets.get(key) ?? []
  const fresh = hits.filter((t) => now - t < windowMs)
  buckets.set(key, fresh)
  return fresh.length
}

export interface ThrottleResult {
  allowed: boolean
  current: number
  limit: number
  resetAt: number
}

export function checkAndRecord(
  key: string,
  limit: number,
  windowSeconds: number,
): ThrottleResult {
  const now = Date.now()
  const windowMs = windowSeconds * 1_000
  const current = pruneAndCount(key, now, windowMs)
  if (current >= limit) {
    const oldest = (buckets.get(key) ?? [])[0] ?? now
    return { allowed: false, current, limit, resetAt: oldest + windowMs }
  }
  buckets.get(key)!.push(now)
  return { allowed: true, current: current + 1, limit, resetAt: now + windowMs }
}

export function peek(key: string, windowSeconds: number): number {
  return pruneAndCount(key, Date.now(), windowSeconds * 1_000)
}

export function resetThrottle(key?: string) {
  if (key) buckets.delete(key)
  else buckets.clear()
}
