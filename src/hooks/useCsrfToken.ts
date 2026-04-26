'use client'

import { useEffect, useState, useCallback } from 'react'

const STORAGE_KEY = 'csrf-token-v1'
const REFRESH_MS = 23 * 60 * 60 * 1000

type CsrfState = {
  token: string | null
  loading: boolean
  error: string | null
}

async function fetchCsrfToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/v1/csrf', { credentials: 'include' })
    if (!res.ok) return null
    const data = (await res.json()) as { token?: string }
    return data.token ?? null
  } catch {
    return null
  }
}

export function useCsrfToken(): CsrfState & { refresh: () => Promise<void> } {
  const [state, setState] = useState<CsrfState>({ token: null, loading: true, error: null })

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    const token = await fetchCsrfToken()
    if (token) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ token, ts: Date.now() }))
      } catch {
        // storage unavailable
      }
      setState({ token, loading: false, error: null })
    } else {
      setState({ token: null, loading: false, error: 'csrf_fetch_failed' })
    }
  }, [])

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as { token: string; ts: number }
        if (Date.now() - parsed.ts < REFRESH_MS) {
          setState({ token: parsed.token, loading: false, error: null })
          return
        }
      }
    } catch {
      // ignore
    }
    void refresh()
  }, [refresh])

  return { ...state, refresh }
}

export function getCsrfTokenSync(): string | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { token: string; ts: number }
    if (Date.now() - parsed.ts > REFRESH_MS) return null
    return parsed.token
  } catch {
    return null
  }
}

export function clearCsrfToken(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
