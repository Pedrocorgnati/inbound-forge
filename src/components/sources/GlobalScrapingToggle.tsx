'use client'

// TASK-14 (CL-251): toggle global de scraping. Admin-only na UI.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

interface FlagResp { success: boolean; data: { key: string; enabled: boolean } }

const FLAG_KEY = 'scrapingEnabled'
const ENDPOINT = `/api/v1/settings/flags/${FLAG_KEY}`

export function GlobalScrapingToggle() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery<FlagResp>({
    queryKey: ['flag', FLAG_KEY],
    queryFn: async () => {
      const res = await fetch(ENDPOINT)
      if (!res.ok) throw new Error('falha')
      return res.json()
    },
  })

  const mutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await fetch(ENDPOINT, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      if (!res.ok) throw new Error(`Falha (${res.status})`)
      return res.json() as Promise<FlagResp>
    },
    onSuccess: (r) => {
      toast.success(r.data.enabled ? 'Scraping ativo' : 'Scraping pausado')
      qc.invalidateQueries({ queryKey: ['flag', FLAG_KEY] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Erro'),
  })

  const enabled = data?.data.enabled ?? true

  return (
    <div
      className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3"
      data-testid="scraping-global-toggle"
    >
      <div>
        <p className="text-sm font-medium">Scraping global</p>
        <p className="text-xs text-muted-foreground">
          {enabled
            ? 'Workers processando normalmente.'
            : 'Todos os workers de scraping estão pausados.'}
        </p>
      </div>
      <button
        type="button"
        disabled={isLoading || mutation.isPending}
        onClick={() => mutation.mutate(!enabled)}
        aria-pressed={enabled}
        className={
          'relative h-6 w-12 rounded-full transition-colors ' +
          (enabled ? 'bg-primary' : 'bg-muted')
        }
      >
        <span
          className={
            'absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform ' +
            (enabled ? 'translate-x-6' : 'translate-x-0.5')
          }
        />
      </button>
    </div>
  )
}

export function GlobalScrapingBanner() {
  const { data } = useQuery<FlagResp>({
    queryKey: ['flag', FLAG_KEY],
    queryFn: async () => {
      const res = await fetch(ENDPOINT)
      if (!res.ok) throw new Error('falha')
      return res.json()
    },
  })
  if (data && !data.data.enabled) {
    return (
      <div
        className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        data-testid="scraping-paused-banner"
      >
        Scraping está pausado globalmente. Workers não consumirão a fila até reativar.
      </div>
    )
  }
  return null
}
