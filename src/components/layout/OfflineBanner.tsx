'use client'

/**
 * OfflineBanner — Intake Review TASK-14 ST003 (CL-272).
 * Banner sticky que aparece quando a conexao cai (navigator.onLine=false).
 */
import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export function OfflineBanner() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    // Estado inicial: `navigator` so existe no client.
    setOffline(typeof navigator !== 'undefined' && navigator.onLine === false)
    function onOffline() { setOffline(true) }
    function onOnline() { setOffline(false) }
    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)
    return () => {
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
    }
  }, [])

  if (!offline) return null

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="offline-banner"
      className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground"
    >
      <WifiOff className="h-4 w-4" aria-hidden />
      Sem conexao — verifique sua rede. Dados podem estar desatualizados.
    </div>
  )
}
