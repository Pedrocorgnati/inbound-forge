/**
 * Erros de integracao — Inbound Forge
 * TASK-4 ST001 / CL-235, CL-236
 *
 * Hierarquia:
 *   IntegrationError (base, boundary captura via `instanceof`)
 *   ├── SupabaseUnavailableError  (CL-235)
 *   └── RedisUnavailableError    (CL-236)
 */

export class IntegrationError extends Error {
  readonly code: string
  constructor(code: string, message: string, cause?: unknown) {
    super(message)
    this.name = 'IntegrationError'
    this.code = code
    if (cause) this.cause = cause
  }
}

export class SupabaseUnavailableError extends IntegrationError {
  constructor(message = 'Supabase indisponivel apos retries', cause?: unknown) {
    super('SUPABASE_UNAVAILABLE', message, cause)
    this.name = 'SupabaseUnavailableError'
  }
}

export class RedisUnavailableError extends IntegrationError {
  constructor(message = 'Redis indisponivel (circuit open)', cause?: unknown) {
    super('REDIS_UNAVAILABLE', message, cause)
    this.name = 'RedisUnavailableError'
  }
}

export function isNetworkError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    return (
      err.name === 'AbortError' ||
      msg.includes('network') ||
      msg.includes('timeout') ||
      msg.includes('econnrefused') ||
      msg.includes('enotfound') ||
      msg.includes('fetch failed')
    )
  }
  return false
}
