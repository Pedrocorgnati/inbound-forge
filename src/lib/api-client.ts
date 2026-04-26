import { getCsrfTokenSync, clearCsrfToken } from '@/hooks/useCsrfToken'

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
