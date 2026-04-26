/**
 * Supabase com retry exponencial — Inbound Forge
 * TASK-4 ST001 / CL-235
 *
 * Apenas retenta em erros de rede/timeout. Erros 4xx (logicos) nao sao retriados.
 * Apos esgotar os retries, lanca `SupabaseUnavailableError`.
 */
import { SupabaseUnavailableError, isNetworkError } from '@/lib/errors/integration-errors'

export interface RetryOptions {
  retries?: number
  backoffMs?: number[]
}

const DEFAULT_BACKOFF: number[] = [200, 800, 2000]

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const { retries = 3, backoffMs = DEFAULT_BACKOFF } = opts
  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err

      // Nao retenta em erros logicos (4xx): apenas rede/timeout
      if (!isNetworkError(err)) throw err

      if (attempt < retries) {
        const delay = backoffMs[attempt] ?? backoffMs[backoffMs.length - 1]
        await sleep(delay)
      }
    }
  }

  throw new SupabaseUnavailableError(
    `Supabase indisponivel apos ${retries} tentativas`,
    lastError
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
