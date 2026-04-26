'use client'

// TokenExpirationBanner — alerta persistente quando ha credenciais expirando/falhando (TASK-8 ST004)

import { useEffect, useState } from 'react'

type BannerItem = {
  provider: string
  status: 'WARN' | 'CRITICAL' | 'FAILED'
  message: string
  daysUntilExpiration?: number
}

type Props = {
  renewUrl?: string
}

export function TokenExpirationBanner({ renewUrl }: Props) {
  const [items, setItems] = useState<BannerItem[]>([])
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/v1/settings/api-keys/status')
        if (!res.ok) return
        const data = (await res.json()) as { items?: BannerItem[] }
        if (!cancelled && Array.isArray(data.items)) setItems(data.items)
      } catch {
        /* silencioso — banner eh best-effort */
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  if (dismissed || items.length === 0) return null

  const critical = items.filter((i) => i.status === 'CRITICAL' || i.status === 'FAILED')
  const warn = items.filter((i) => i.status === 'WARN')
  const hasCritical = critical.length > 0

  return (
    <div
      role="alert"
      aria-live="polite"
      className={
        hasCritical
          ? 'mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-900'
          : 'mb-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900'
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <strong className="block">
            {hasCritical
              ? 'Credenciais em estado critico — acao urgente'
              : 'Credenciais proximas do vencimento'}
          </strong>
          <ul className="mt-2 list-disc pl-5">
            {[...critical, ...warn].map((i) => (
              <li key={i.provider}>
                <span className="font-medium capitalize">{i.provider}</span> — {i.message}
                {i.daysUntilExpiration !== undefined && ` (${i.daysUntilExpiration}d)`}
              </li>
            ))}
          </ul>
          {renewUrl && (
            <a
              href={renewUrl}
              target="_blank"
              rel="noopener"
              className="mt-2 inline-block rounded bg-white px-3 py-1 text-xs underline-offset-4 hover:underline"
            >
              Abrir guia de renovacao
            </a>
          )}
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Fechar aviso"
          className="rounded border bg-white px-2 py-0.5 text-xs"
        >
          ×
        </button>
      </div>
    </div>
  )
}
