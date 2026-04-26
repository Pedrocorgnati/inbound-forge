'use client'

// TASK-20 ST002 (CL-280): hook que intercepta fetch global e dispara
// evento customizado sempre que recebe 401, ativando o SessionExpiredModal.
// Salva um snapshot opcional do DOM dos formularios em localStorage.

import { useEffect, useState } from 'react'

export const SESSION_EXPIRED_EVENT = 'session:expired'

let installed = false

function installFetchInterceptor() {
  if (installed || typeof window === 'undefined') return
  installed = true
  const orig = window.fetch.bind(window)
  window.fetch = async (input, init) => {
    const res = await orig(input, init)
    if (res.status === 401) {
      try {
        window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
      } catch {
        // ignore
      }
    }
    return res
  }
}

export function useSessionExpiration() {
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    installFetchInterceptor()
    const handler = () => setExpired(true)
    window.addEventListener(SESSION_EXPIRED_EVENT, handler)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handler)
  }, [])

  return { expired, dismiss: () => setExpired(false) }
}

export function saveDraftSnapshot(key = 'session-expired-draft') {
  if (typeof window === 'undefined') return
  const data: Record<string, string> = {}
  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input[name], textarea[name]').forEach(
    (el) => {
      if (el.type === 'password') return
      if (el.name) data[el.name] = el.value
    },
  )
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: new Date().toISOString(), data }))
  } catch {
    // storage cheio: ignorar
  }
}
