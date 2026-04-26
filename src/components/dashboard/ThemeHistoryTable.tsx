'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Inbox } from 'lucide-react'
import { EmptyState } from '@/components/shared/empty-state'
import { Badge } from '@/components/ui/badge'

interface HistoryRow {
  id: string
  title: string
  status: string
  score: number
  lastAction: string
  conversions: number
  rejectionReason: string | null
  channels: string[]
}

interface Props {
  initialStatus?: string
  initialChannel?: string
}

export function ThemeHistoryTable({ initialStatus, initialChannel }: Props) {
  const { locale } = useParams<{ locale: string }>()
  const [rows, setRows] = useState<HistoryRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | undefined>(initialStatus)
  const [channel, setChannel] = useState<string | undefined>(initialChannel)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (status) params.set('status', status)
    if (channel) params.set('channel', channel)
    setIsLoading(true)
    fetch(`/api/v1/themes/history?${params}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Falha ao carregar historico')
        return res.json()
      })
      .then((json) => {
        setRows(json.data ?? [])
        setTotal(json.pagination?.total ?? 0)
        setError(null)
      })
      .catch(() => setError('Nao foi possivel carregar o historico.'))
      .finally(() => setIsLoading(false))
  }, [status, channel, page])

  const statusOptions = [
    { label: 'Todos', value: undefined },
    { label: 'Ativos', value: 'ACTIVE' },
    { label: 'Despriorizados', value: 'DEPRIORITIZED' },
    { label: 'Rejeitados', value: 'REJECTED' },
  ] as const

  return (
    <div className="space-y-4" data-testid="theme-history-table">
      <div className="flex flex-wrap items-center gap-2">
        {statusOptions.map((opt) => (
          <button
            key={opt.label}
            onClick={() => {
              setPage(1)
              setStatus(opt.value)
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              status === opt.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        ))}
        <input
          type="text"
          placeholder="Canal (ex: whatsapp)"
          value={channel ?? ''}
          onChange={(e) => {
            setPage(1)
            setChannel(e.target.value || undefined)
          }}
          className="ml-auto rounded-md border border-border bg-background px-3 py-1.5 text-sm"
        />
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!error && !isLoading && rows.length === 0 ? (
        <EmptyState icon={<Inbox className="h-10 w-10" />} title="Sem historico" description="Nenhum tema casa com os filtros aplicados." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-3 py-2">Tema</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Ultima acao</th>
                <th className="px-3 py-2">Score final</th>
                <th className="px-3 py-2">Conversoes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <Link href={`/${locale}/themes/${r.id}`} className="text-primary hover:underline">
                      {r.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={r.status === 'REJECTED' ? 'danger' : 'success'}>{r.status}</Badge>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(r.lastAction).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 font-medium">{r.score}</td>
                  <td className="px-3 py-2">{r.conversions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Pagina {page} &middot; {total} itens
        </span>
        <div className="flex gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-md border border-border px-3 py-1 disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            disabled={page * 20 >= total}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border border-border px-3 py-1 disabled:opacity-50"
          >
            Proxima
          </button>
        </div>
      </div>
    </div>
  )
}
