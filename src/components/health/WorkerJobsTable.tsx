'use client'

/**
 * TASK-4 ST004 (CL-TH-059): painel de jobs da fila.
 * Filtros: status, type, date range. Estados UX completos.
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

type JobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'DEAD_LETTER'

interface Job {
  id: string
  type: string
  status: JobStatus
  retryCount: number
  error: string | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
}

interface Filters {
  status?: JobStatus
  type?: string
  from?: string
  to?: string
  page: number
}

const STATUS_BADGE: Record<JobStatus, string> = {
  PENDING: 'bg-muted text-foreground',
  RUNNING: 'bg-blue-500/15 text-blue-600',
  COMPLETED: 'bg-emerald-500/15 text-emerald-600',
  FAILED: 'bg-orange-500/15 text-orange-600',
  DEAD_LETTER: 'bg-destructive/15 text-destructive',
}

const LIMIT = 50

function formatDuration(started: string | null, completed: string | null): string {
  if (!started || !completed) return '—'
  const ms = new Date(completed).getTime() - new Date(started).getTime()
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export function WorkerJobsTable() {
  const [filters, setFilters] = useState<Filters>({ page: 1 })
  const queryClient = useQueryClient()

  const params = new URLSearchParams({ limit: String(LIMIT), page: String(filters.page) })
  if (filters.status) params.set('status', filters.status)
  if (filters.type) params.set('type', filters.type)
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['worker-jobs', params.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/v1/health/jobs?${params.toString()}`)
      if (!res.ok) throw new Error(`Falha (${res.status})`)
      return res.json() as Promise<{
        data: Job[]
        pagination: { page: number; total: number; totalPages: number; hasMore: boolean }
      }>
    },
  })

  const requeue = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await fetch(`/api/v1/health/jobs/${jobId}/requeue`, { method: 'POST' })
      if (!res.ok) throw new Error(`Falha (${res.status})`)
      return res.json()
    },
    onSuccess: () => {
      toast.success('Job reprocessado')
      queryClient.invalidateQueries({ queryKey: ['worker-jobs'] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Erro'),
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-xs">
          <span className="mb-1 text-muted-foreground">Status</span>
          <select
            className="rounded-md border border-border bg-background px-2 py-1 text-sm"
            value={filters.status ?? ''}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                status: (e.target.value || undefined) as JobStatus | undefined,
                page: 1,
              }))
            }
          >
            <option value="">Todos</option>
            {(Object.keys(STATUS_BADGE) as JobStatus[]).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-xs">
          <span className="mb-1 text-muted-foreground">Tipo</span>
          <input
            className="rounded-md border border-border bg-background px-2 py-1 text-sm"
            placeholder="ex: image.generate"
            value={filters.type ?? ''}
            onChange={(e) =>
              setFilters((f) => ({ ...f, type: e.target.value || undefined, page: 1 }))
            }
          />
        </label>
        <label className="flex flex-col text-xs">
          <span className="mb-1 text-muted-foreground">De</span>
          <input
            type="date"
            className="rounded-md border border-border bg-background px-2 py-1 text-sm"
            value={filters.from ?? ''}
            onChange={(e) =>
              setFilters((f) => ({ ...f, from: e.target.value || undefined, page: 1 }))
            }
          />
        </label>
        <label className="flex flex-col text-xs">
          <span className="mb-1 text-muted-foreground">Ate</span>
          <input
            type="date"
            className="rounded-md border border-border bg-background px-2 py-1 text-sm"
            value={filters.to ?? ''}
            onChange={(e) =>
              setFilters((f) => ({ ...f, to: e.target.value || undefined, page: 1 }))
            }
          />
        </label>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-md border border-border px-3 py-1 text-sm hover:bg-muted"
        >
          Atualizar
        </button>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          Erro ao carregar jobs.
          <button
            type="button"
            onClick={() => refetch()}
            className="ml-2 underline"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {data && data.data.length === 0 && !isLoading && (
        <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Sem jobs para os filtros selecionados.
        </div>
      )}

      {data && data.data.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase">
              <tr>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Retries</th>
                <th className="px-3 py-2">Duracao</th>
                <th className="px-3 py-2">Criado</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((job) => (
                <tr key={job.id} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-xs">{job.type}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[job.status]}`}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">{job.retryCount}</td>
                  <td className="px-3 py-2">{formatDuration(job.startedAt, job.completedAt)}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {new Date(job.createdAt).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {job.status === 'DEAD_LETTER' && (
                      <button
                        type="button"
                        onClick={() => requeue.mutate(job.id)}
                        disabled={requeue.isPending}
                        className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-60"
                      >
                        Reprocessar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Pagina {data.pagination.page} de {data.pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={filters.page <= 1}
              onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
              className="rounded-md border border-border px-3 py-1 hover:bg-muted disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={!data.pagination.hasMore}
              onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
              className="rounded-md border border-border px-3 py-1 hover:bg-muted disabled:opacity-50"
            >
              Proxima
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
