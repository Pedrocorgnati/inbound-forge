'use client'

// TASK-9 ST001 (CL-288): tabela paginada de ScrapingAuditLog.

import { useQuery } from '@tanstack/react-query'
import { useSearchParams, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface AuditRow {
  id: string
  createdAt: string
  sourceId: string
  sourceUrl: string
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED'
  textsCollected: number
  textsClassified: number
  errorsCount: number
  durationMs: number
  errorMessage?: string | null
  source?: { id: string; name: string; type: string } | null
}

interface ApiResp {
  success: boolean
  data: AuditRow[]
  pagination: { page: number; limit: number; total: number; totalPages: number; hasMore: boolean }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString()
}

const STATUS_COLOR: Record<AuditRow['status'], string> = {
  SUCCESS: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  PARTIAL: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  FAILED: 'bg-destructive/15 text-destructive',
}

export function ScrapingAuditTable() {
  const params = useSearchParams()
  const router = useRouter()
  const page = parseInt(params.get('page') ?? '1')

  const qs = params.toString()
  const { data, isLoading, error } = useQuery<ApiResp>({
    queryKey: ['scraping-audit', qs],
    queryFn: async () => {
      const res = await fetch(`/api/v1/compliance/scraping-audit?${qs}`)
      if (!res.ok) throw new Error(`Falha ao carregar (${res.status})`)
      return res.json()
    },
  })

  const goTo = (p: number) => {
    const next = new URLSearchParams(params.toString())
    next.set('page', String(p))
    router.replace(`?${next.toString()}`)
  }

  if (isLoading) {
    return (
      <div className="space-y-2" data-testid="audit-loading">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 rounded-md bg-muted/40 animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-destructive">Erro ao carregar logs.</p>
  }

  const rows = data?.data ?? []
  const pag = data?.pagination

  return (
    <div className="space-y-3" data-testid="audit-table-wrap">
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Timestamp</th>
              <th className="px-3 py-2 text-left">Source</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-right">Coletados</th>
              <th className="px-3 py-2 text-right">Classificados</th>
              <th className="px-3 py-2 text-right">Erros</th>
              <th className="px-3 py-2 text-right">Duração (ms)</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                  Nenhum registro.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2 whitespace-nowrap">{formatDate(r.createdAt)}</td>
                <td className="px-3 py-2">
                  <div className="font-medium">{r.source?.name ?? r.sourceId}</div>
                  <div className="text-xs text-muted-foreground">{r.sourceUrl}</div>
                </td>
                <td className="px-3 py-2">
                  <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs', STATUS_COLOR[r.status])}>
                    {r.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">{r.textsCollected}</td>
                <td className="px-3 py-2 text-right">{r.textsClassified}</td>
                <td className="px-3 py-2 text-right">{r.errorsCount}</td>
                <td className="px-3 py-2 text-right">{r.durationMs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pag && pag.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Página {pag.page} de {pag.totalPages} — {pag.total} registros
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => goTo(page - 1)}
              className="rounded-md border border-border px-3 py-1 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              disabled={!pag.hasMore}
              onClick={() => goTo(page + 1)}
              className="rounded-md border border-border px-3 py-1 disabled:opacity-50"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
