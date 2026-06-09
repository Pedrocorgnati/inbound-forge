import { getCsrfTokenSync, clearCsrfToken } from '@/hooks/useCsrfToken'
import { uuidv7 } from '@/lib/utils/uuidv7'

const MUTATIVE_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH'])

async function mintCsrfToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/v1/csrf', { credentials: 'include' })
    if (!res.ok) return null
    const data = (await res.json()) as { token?: string }
    return data.token ?? null
  } catch {
    return null
  }
}

export type ApiClientInit = RequestInit & { retryOn403?: boolean }

export async function apiClient(input: string, init: ApiClientInit = {}): Promise<Response> {
  const method = (init.method || 'GET').toUpperCase()
  const headers = new Headers(init.headers || {})
  const opts: RequestInit = { ...init, method, headers, credentials: 'include' }

  if (MUTATIVE_METHODS.has(method)) {
    let token = getCsrfTokenSync()
    if (!token) token = await mintCsrfToken()
    if (token) headers.set('x-csrf-token', token)

    // Idempotency-Key (UUID v7) e obrigatorio nas mutations criticas embrulhadas
    // por withIdempotency (jobs/content/posts/leads/instagram approve|publish):
    // sem o header a rota responde 400 ERR-060. Geramos uma chave por chamada
    // quando o caller nao fornece uma; um caller que precise de dedup estavel
    // entre submissoes distintas (ex.: protecao a double-submit) deve passar
    // 'Idempotency-Key' em init.headers e reusa-la entre as tentativas. O retry
    // interno de CSRF abaixo reusa este mesmo objeto headers, preservando a key.
    if (!headers.has('Idempotency-Key')) {
      headers.set('Idempotency-Key', uuidv7())
    }
  }

  const response = await fetch(input, opts)

  if (response.status === 403 && MUTATIVE_METHODS.has(method) && init.retryOn403 !== false) {
    try {
      const body = await response.clone().json()
      if (body?.code === 'CSRF_TOKEN_INVALID' || body?.code === 'CSRF_TOKEN_MISSING') {
        clearCsrfToken()
        const fresh = await mintCsrfToken()
        if (fresh) {
          headers.set('x-csrf-token', fresh)
          return fetch(input, { ...opts, headers })
        }
      }
    } catch {
      // body nao era JSON
    }
  }

  return response
}
