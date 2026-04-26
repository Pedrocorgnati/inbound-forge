'use client'

// RejectionHistory — historico de temas rejeitados (TASK-5 ST002)

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

interface RejectedTheme {
  id: string
  title: string
  rejectionReason: string | null
  rejectedAt: string | null
  rejectedBy: string | null
  conversionScore: number
  pain: { title: string } | null
}

interface ApiResp {
  success: boolean
  data: RejectedTheme[]
  pagination: { total: number; page: number; limit: number }
}

export function RejectionHistory() {
  const [reason, setReason] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const limit = 20

  const params = new URLSearchParams()
  if (reason.trim()) params.set('reason', reason.trim())
  if (from) params.set('from', new Date(from).toISOString())
  if (to) params.set('to', new Date(to).toISOString())
  params.set('page', String(page))
  params.set('limit', String(limit))

  const { data, isLoading, error } = useQuery<ApiResp>({
    queryKey: ['themes-rejected', params.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/v1/themes/rejected?${params.toString()}`)
      if (!res.ok) throw new Error(`Falha ao carregar (${res.status})`)
      return res.json()
    },
  })

  const total = data?.pagination?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <section className="space-y-4" data-testid="rejection-history">
      <div className="flex flex-wrap items-end gap-3 rounded border bg-card p-3">
        <div>
          <label className="block text-xs font-medium" htmlFor="rh-reason">
            Motivo (contem)
          </label>
          <input
            id="rh-reason"
            value={reason}
            onChange={(e) => {
              setPage(1)
              setReason(e.target.value)
            }}
            placeholder="ex: fora do nicho"
            className="mt-1 rounded border px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium" htmlFor="rh-from">
            De
          </label>
          <input
            id="rh-from"
            type="date"
            value={from}
            onChange={(e) => {
              setPage(1)
              setFrom(e.target.value)
            }}
            className="mt-1 rounded border px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium" htmlFor="rh-to">
            Ate
          </label>
          <input
            id="rh-to"
            type="date"
            value={to}
            onChange={(e) => {
              setPage(1)
              setTo(e.target.value)
            }}
            className="mt-1 rounded border px-2 py-1 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setReason('')
            setFrom('')
            setTo('')
            setPage(1)
          }}
          className="rounded border px-3 py-1 text-sm"
        >
          Limpar
        </button>
      </div>

      {isLoading && <div className="h-40 animate-pulse rounded-md bg-muted/40" />}
      {error && <p className="text-sm text-destructive">Erro ao carregar historico.</p>}

      {data && data.data.length === 0 && (
        <p className="rounded border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhum tema rejeitado encontrado para os filtros selecionados.
        </p>
      )}

      {data && data.data.length > 0 && (
        <div className="overflow-x-auto rounded border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2">Tema</th>
                <th className="px-3 py-2">Dor</th>
                <th className="px-3 py-2">Score</th>
                <th className="px-3 py-2">Motivo</th>
                <th className="px-3 py-2">Por</th>
                <th className="px-3 py-2">Quando</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-3 py-2">{t.title}</td>
                  <td className="px-3 py-2 text-muted-foreground">{t.pain?.title ?? '—'}</td>
                  <td className="px-3 py-2 tabular-nums">{t.conversionScore}</td>
                  <td className="px-3 py-2 max-w-md whitespace-pre-wrap text-muted-foreground">
                    {t.rejectionReason ?? '—'}
                  </td>
                  <td className="px-3 py-2">{t.rejectedBy ?? '—'}</td>
                  <td className="px-3 py-2 text-xs">
                    {t.rejectedAt ? new Date(t.rejectedAt).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <nav className="flex items-center justify-between text-sm" aria-label="paginacao">
          <span className="text-muted-foreground">
            Pagina {page} de {totalPages} · {total} resultado(s)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded border px-3 py-1 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded border px-3 py-1 disabled:opacity-50"
            >
              Proxima
            </button>
          </div>
        </nav>
      )}
    </section>
  )
}
