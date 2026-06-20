'use client'
/**
 * useNetworkStatus — TASK-4/ST001 (gap CL-215).
 * Hook SSR-safe para detectar perda/retomada de conexao.
 */
import { useEffect, useState } from 'react'

export interface NetworkStatus {
  isOnline: boolean
  lastOnlineAt: Date | null
  lastOfflineAt: Date | null
}

// Estado inicial DETERMINISTICO (igual no server e no primeiro render do client)
// para evitar hydration mismatch. O valor real de navigator.onLine so e lido
// apos a montagem, dentro do useEffect.
function initialStatus(): NetworkStatus {
  return {
    isOnline: true,
    lastOnlineAt: null,
    lastOfflineAt: null,
  }
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(initialStatus)

  useEffect(() => {
    // Sincroniza com o estado real do navegador apos a hidratacao.
    const syncNow = () => {
      const online = navigator.onLine
      setStatus((s) => ({
        ...s,
        isOnline: online,
        lastOnlineAt: online ? new Date() : s.lastOnlineAt,
        lastOfflineAt: online ? s.lastOfflineAt : new Date(),
      }))
    }
    syncNow()

    const onOnline = () =>
      setStatus((s) => ({ ...s, isOnline: true, lastOnlineAt: new Date() }))
    const onOffline = () =>
      setStatus((s) => ({ ...s, isOnline: false, lastOfflineAt: new Date() }))

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  return status
}
