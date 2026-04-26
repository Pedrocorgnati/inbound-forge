'use client'
/**
 * NetworkStatusBanner — TASK-4/ST002 (gap CL-215).
 * Banner global sticky que aparece quando navigator.onLine === false.
 * Acessivel (role=alert, aria-live) e i18n-ready.
 */
import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { WifiOff, RefreshCw } from 'lucide-react'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

export function NetworkStatusBanner() {
  const t = useTranslations('network')
  const { isOnline } = useNetworkStatus()
  const wasOffline = useRef(false)

  useEffect(() => {
    if (isOnline && wasOffline.current) {
      toast.success(t('restored'))
    }
    wasOffline.current = !isOnline
  }, [isOnline, t])

  if (isOnline) return null

  return (
    <div
      role="alert"
      aria-live="polite"
      data-testid="network-status-banner"
      className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-amber-100 px-4 py-2 text-sm text-amber-900 shadow"
    >
      <div className="flex items-center gap-2">
        <WifiOff className="h-4 w-4" aria-hidden />
        <div>
          <p className="font-medium">{t('offlineTitle')}</p>
          <p className="text-xs text-amber-800">{t('offlineBody')}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event('network-retry'))}
        className="inline-flex items-center gap-1 rounded border border-amber-400 bg-white px-3 py-1 text-xs font-medium hover:bg-amber-50"
      >
        <RefreshCw className="h-3 w-3" aria-hidden />
        {t('retry')}
      </button>
    </div>
  )
}
