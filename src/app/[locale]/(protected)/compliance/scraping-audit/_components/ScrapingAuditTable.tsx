'use client'

import { FormEvent, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ClipboardList, ExternalLink, Filter, Loader2 } from 'lucide-react'
import { AuditLogDownloadButton } from '@/components/compliance/AuditLogDownloadButton'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type RobotsDecision = 'allow' | 'deny'

interface ScrapingAuditRow {
  id: string
  createdAt: string
  sourceId: string
  sourceName: string
  sourceUrl: string
  robotsDecision: RobotsDecision
  latencyMs: number
  statusCode: number | null
  correlationId: string
  revealedBy: string | null
  ttlExpiresAt: string
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED'
  textsCollected: number
  textsClassified: number
  errorsCount: number
  errorMessage: string | null
  piiRevealAudit: {
    id: string
    leadId: string
    revealedBy: string
    createdAt: string
    ttlExpiresAt: string
  } | null
}

interface ApiResponse {
  success: boolean
  data: ScrapingAuditRow[]
  pagination: { page: number; limit: number; total: number; totalPages: number; hasMore: boolean }
}

const DECISION_CLASS: Record<RobotsDecision, string> = {
  allow: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  deny: 'bg-destructive/15 text-destructive',
}

const STATUS_CLASS: Record<ScrapingAuditRow['status'], string> = {
  SUCCESS: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  PARTIAL: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  FAILED: 'bg-destructive/15 text-destructive',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function compactId(value: string) {
  if (value.length <= 14) return value
  return `${value.slice(0, 8)}...${value.slice(-4)}`
}

export function ScrapingAuditTable() {
  const router = useRouter()
  const params = useSearchParams()
  const locale = useLocale()
  const [isPending, startTransition] = useTransition()
  const [source, setSource] = useState(params.get('sourceId') ?? '')
  const [correlationId, setCorrelationId] = useState(params.get('correlationId') ?? '')

  const qs = params.toString()
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10))

  const exportEndpoint = useMemo(() => {
    const next = new URLSearchParams(params.toString())
    next.delete('page')
    next.delete('limit')
    return `/api/v1/compliance/scraping-audit/export${next.size ? `?${next.toString()}` : ''}`
  }, [params])

  const { data, isLoading, error, refetch, isFetching } = useQuery<ApiResponse>({
    queryKey: ['scraping-audit-v1', qs],
    queryFn: async () => {
      const res = await fetch(`/api/v1/compliance/scraping-audit?${qs}`)
      const body = await res.json()
      if (!res.ok) {
        throw new Error(body?.error ?? `Falha ao carregar auditoria (${res.status})`)
      }
      return body
    },
  })

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    next.delete('page')
    startTransition(() => router.replace(`?${next.toString()}`))
  }

  const goTo = (nextPage: number) => {
    const next = new URLSearchParams(params.toString())
    next.set('page', String(nextPage))
    startTransition(() => router.replace(`?${next.toString()}`))
  }

  const applyTextFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const next = new URLSearchParams(params.toString())
    if (source.trim()) next.set('sourceId', source.trim())
    else next.delete('sourceId')
    if (correlationId.trim()) next.set('correlationId', correlationId.trim())
    else next.delete('correlationId')
    next.delete('page')
    startTransition(() => router.replace(`?${next.toString()}`))
  }

  const rows = data?.data ?? []
  const pagination = data?.pagination

  return (
    <div className="space-y-4" data-testid="scraping-audit-table">
      <form
        onSubmit={applyTextFilters}
        className="grid gap-3 rounded-md border border-border bg-card p-3 md:grid-cols-[repeat(5,minmax(0,1fr))_auto]"
        data-testid="scraping-audit-filters"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span>De</span>
          <input
            type="date"
            value={params.get('from') ?? ''}
            onChange={(event) => setParam('from', event.target.value || null)}
            className="h-9 rounded-md border border-border bg-background px-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Ate</span>
          <input
            type="date"
            value={params.get('to') ?? ''}
            onChange={(event) => setParam('to', event.target.value || null)}
            className="h-9 rounded-md border border-border bg-background px-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Source</span>
          <input
            type="text"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            placeholder="source_id"
            className="h-9 rounded-md border border-border bg-background px-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Decisao</span>
          <select
            value={params.get('decision') ?? ''}
            onChange={(event) => setParam('decision', event.target.value || null)}
            className="h-9 rounded-md border border-border bg-background px-2"
          >
            <option value="">Todas</option>
            <option value="allow">allow</option>
            <option value="deny">deny</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Correlation ID</span>
          <input
            type="text"
            value={correlationId}
            onChange={(event) => setCorrelationId(event.target.value)}
            placeholder="opcional"
            className="h-9 rounded-md border border-border bg-background px-2"
          />
        </label>
        <div className="flex items-end gap-2">
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Filter className="h-4 w-4" aria-hidden />}
            Filtrar
          </Button>
          <AuditLogDownloadButton endpoint={exportEndpoint} filename="scraping-audit.csv" label="CSV" />
        </div>
      </form>

      {isLoading && (
        <div className="space-y-2" data-testid="scraping-audit-loading">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="h-12 animate-pulse rounded-md bg-muted/40" />
          ))}
        </div>
      )}

      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            <span>{error instanceof Error ? error.message : 'Erro ao carregar auditoria.'}</span>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}

      {!isLoading && !error && rows.length === 0 && (
        <EmptyState
          icon={<ClipboardList className="h-12 w-12" />}
          title="Nenhum evento de scraping"
          description="Ajuste os filtros ou execute uma coleta para gerar novos eventos auditaveis."
          ctaLabel="Revisar fontes"
          ctaHref={`/${locale}/sources`}
        />
      )}

      {!isLoading && !error && rows.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[1040px] text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Data</th>
                <th className="px-3 py-2 text-left">Source</th>
                <th className="px-3 py-2 text-left">robots.txt</th>
                <th className="px-3 py-2 text-right">Latencia</th>
                <th className="px-3 py-2 text-right">status_code</th>
                <th className="px-3 py-2 text-left">correlation_id</th>
                <th className="px-3 py-2 text-left">PIIRevealAudit</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border align-top">
                  <td className="whitespace-nowrap px-3 py-2">{formatDate(row.createdAt)}</td>
                  <td className="max-w-[280px] px-3 py-2">
                    <div className="font-medium">{row.sourceName}</div>
                    <div className="truncate text-xs text-muted-foreground">{row.sourceUrl}</div>
                    <div className="text-xs text-muted-foreground">{row.sourceId}</div>
                  </td>
                  <td className="px-3 py-2">
                    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs', DECISION_CLASS[row.robotsDecision])}>
                      {row.robotsDecision}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">{row.latencyMs} ms</td>
                  <td className="px-3 py-2 text-right">{row.statusCode ?? '-'}</td>
                  <td className="px-3 py-2 font-mono text-xs" title={row.correlationId}>
                    {compactId(row.correlationId)}
                  </td>
                  <td className="px-3 py-2">
                    {row.piiRevealAudit ? (
                      <Link
                        href={`/${locale}/leads/${row.piiRevealAudit.leadId}`}
                        className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                      >
                        PIIRevealAudit
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                    {row.revealedBy && (
                      <div className="mt-1 text-xs text-muted-foreground">revealedBy: {compactId(row.revealedBy)}</div>
                    )}
                    <div className="mt-1 text-xs text-muted-foreground">TTL: {formatDate(row.ttlExpiresAt)}</div>
                  </td>
                  <td className="px-3 py-2">
                    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs', STATUS_CLASS[row.status])}>
                      {row.status}
                    </span>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {row.textsCollected} coletados, {row.textsClassified} classificados
                    </div>
                    {row.errorsCount > 0 && (
                      <div className="mt-1 text-xs text-destructive">{row.errorsCount} erro(s)</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">
            Pagina {pagination.page} de {pagination.totalPages}. {pagination.total} registros.
            {isFetching && ' Atualizando...'}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={page <= 1 || isPending} onClick={() => goTo(page - 1)}>
              Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!pagination.hasMore || isPending}
              onClick={() => goTo(page + 1)}
            >
              Proxima
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
