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

function initialStatus(): NetworkStatus {
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true
  return {
    isOnline: online,
    lastOnlineAt: online ? new Date() : null,
    lastOfflineAt: online ? null : new Date(),
  }
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(initialStatus)

  useEffect(() => {
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
