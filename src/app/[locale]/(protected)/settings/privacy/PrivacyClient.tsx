'use client'
/**
 * Rastreabilidade: CL-298, TASK-2 ST004
 * UI client: solicitar export LGPD async com polling de status.
 */
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

interface ExportRequest {
  id: string
  status: 'pending' | 'processing' | 'ready' | 'expired' | 'failed'
  fileUrl: string | null
  expiresAt: string | null
  requestedAt: string
  isExpired: boolean
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Aguardando...',
  processing: 'Gerando arquivo...',
  ready: 'Pronto',
  expired: 'Expirado',
  failed: 'Falhou',
}

const STATUS_CLASS: Record<string, string> = {
  pending: 'text-yellow-500',
  processing: 'text-blue-500',
  ready: 'text-emerald-500',
  expired: 'text-muted-foreground',
  failed: 'text-destructive',
}

export function PrivacyClient() {
  const [requests, setRequests] = useState<ExportRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [polling, setPolling] = useState(false)
  const tToast = useTranslations('toasts')

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/me/data-export')
      if (res.ok) {
        const data = (await res.json()) as { requests: ExportRequest[] }
        setRequests(data.requests ?? [])
      }
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    void fetchHistory()
  }, [fetchHistory])

  useEffect(() => {
    const hasPending = requests.some((r) => r.status === 'pending' || r.status === 'processing')
    if (!hasPending) {
      setPolling(false)
      return
    }
    setPolling(true)
    const interval = setInterval(() => void fetchHistory(), 10_000)
    return () => clearInterval(interval)
  }, [requests, fetchHistory])

  async function handleRequest() {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/me/data-export', { method: 'POST' })
      if (res.status === 429) {
        const data = (await res.json().catch(() => ({}))) as { retryAfterSeconds?: number }
        const minutes = Math.ceil((data.retryAfterSeconds ?? 86400) / 60)
        toast.error(`Limite: aguarde ${minutes} min para novo export.`)
        return
      }
      if (!res.ok) {
        toast.error(tToast('settings.export_request_failed'))
        return
      }
      // CP-COMP-03: o export agora e processado na propria requisicao; o link de
      // download aparece na lista abaixo assim que fica pronto (sem prometer um
      // email que ainda nao e enviado).
      const data = (await res.json().catch(() => ({}))) as { status?: string }
      toast.success(
        data.status === 'ready'
          ? 'Export pronto! O link de download aparece na lista abaixo.'
          : 'Export solicitado! O link aparece na lista abaixo quando ficar pronto.',
      )
      await fetchHistory()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={handleRequest}
        disabled={loading}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        data-testid="request-data-export"
      >
        {loading ? 'Solicitando...' : 'Solicitar export de dados (LGPD)'}
      </button>

      {polling && (
        <p className="text-xs text-muted-foreground animate-pulse">
          Aguardando geração do arquivo...
        </p>
      )}

      {requests.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Histórico de exports</h3>
          <ul className="divide-y divide-border rounded-md border border-border text-sm">
            {requests.map((r) => (
              <li key={r.id} className="flex items-center justify-between px-3 py-2">
                <div>
                  <span className={STATUS_CLASS[r.status] ?? 'text-muted-foreground'}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {new Date(r.requestedAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                {r.status === 'ready' && r.fileUrl && (
                  <a
                    href={r.fileUrl}
                    download
                    className="rounded border border-border px-2 py-1 text-xs hover:bg-muted"
                    data-testid={`download-export-${r.id}`}
                  >
                    Baixar
                  </a>
                )}
                {r.isExpired && (
                  <span className="text-xs text-muted-foreground">Link expirado</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
