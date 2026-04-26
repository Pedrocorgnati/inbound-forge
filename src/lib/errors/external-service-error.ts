/**
 * Intake-Review TASK-8 (CL-309): erro padronizado para falhas em servicos
 * externos (Claude, Ideogram, Flux, Browserless, Instagram, etc).
 *
 * API routes capturam e retornam HTTP 503 com body:
 *   { code: 'EXTERNAL_SERVICE_DOWN', service, retryAfter, message }
 *
 * O hook useApiError (client) traduz em toast pt-BR/en/it/es.
 */
export class ExternalServiceError extends Error {
  readonly code = 'EXTERNAL_SERVICE_DOWN' as const

  constructor(
    public readonly service: string,
    public readonly retryAfter: number,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'ExternalServiceError'
  }
}

/**
 * Wrapper `fetch` com AbortController + timeout. Em timeout ou status 5xx,
 * lanca `ExternalServiceError`. Use nos integration clients em
 * `src/lib/integrations/*` e `src/lib/ai/*`.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  opts: { service: string; timeoutMs?: number; retryAfter?: number } = {
    service: 'external',
    timeoutMs: 60_000,
    retryAfter: 30,
  },
): Promise<Response> {
  const { service, timeoutMs = 60_000, retryAfter = 30 } = opts
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...init, signal: controller.signal })
    if (res.status >= 500) {
      throw new ExternalServiceError(service, retryAfter, `${service} retornou ${res.status}`)
    }
    return res
  } catch (err) {
    if (err instanceof ExternalServiceError) throw err
    if ((err as { name?: string })?.name === 'AbortError') {
      throw new ExternalServiceError(service, retryAfter, `${service} timeout apos ${timeoutMs}ms`, err)
    }
    throw new ExternalServiceError(service, retryAfter, `${service} erro de rede`, err)
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Helper para uso dentro de API routes Next.js:
 *
 *   try { ... } catch (e) { return handleExternalError(e) ?? internalError() }
 */
export function handleExternalError(err: unknown): Response | null {
  if (err instanceof ExternalServiceError) {
    return new Response(
      JSON.stringify({
        code: err.code,
        service: err.service,
        retryAfter: err.retryAfter,
        message: err.message,
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(err.retryAfter),
        },
      },
    )
  }
  return null
}
