'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, CheckCircle2, GitCompareArrows, RefreshCw, SearchX } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Pagination } from '@/components/ui/pagination'
import { Select } from '@/components/ui/select'
import { EmptyState } from '@/components/shared/empty-state'

type ReconciliationStatus = 'matched' | 'unmatched' | 'disputed'
type ReconciliationType = 'click_without_conversion' | 'conversion_without_post'

interface ReconciliationRow {
  id: string
  type: ReconciliationType
  postId: string | null
  leadId: string | null
  weekOf: string
  resolved: boolean
  resolution: string | null
  status: ReconciliationStatus
  leadName: string | null
  theme: { id: string; title: string; conversionScore: number } | null
  conversionCount: number
  matchingLabel: string
}

interface ApiResponse {
  data?: ReconciliationRow[]
  pagination?: { page: number; limit: number; total: number; totalPages: number }
  error?: string
}

interface ReconciliationPageClientProps {
  locale: string
}

const PAGE_SIZE = 20

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os status' },
  { value: 'unmatched', label: 'Unmatched' },
  { value: 'matched', label: 'Matched' },
  { value: 'disputed', label: 'Disputed' },
]

const STATUS_LABELS: Record<ReconciliationStatus, string> = {
  matched: 'Matched',
  unmatched: 'Unmatched',
  disputed: 'Disputed',
}

const STATUS_VARIANT: Record<ReconciliationStatus, 'success' | 'warning' | 'danger'> = {
  matched: 'success',
  unmatched: 'warning',
  disputed: 'danger',
}

const TYPE_LABELS: Record<ReconciliationType, string> = {
  click_without_conversion: 'Post com clique sem conversão',
  conversion_without_post: 'Conversão sem post atribuído',
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}

function getPanelItems(items: ReconciliationRow[], type: ReconciliationType) {
  return items.filter((item) => item.type === type)
}

export function ReconciliationPageClient({ locale }: ReconciliationPageClientProps) {
  const tToast = useTranslations('toasts')
  const [items, setItems] = useState<ReconciliationRow[]>([])
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
    if (status !== 'all') params.set('status', status)

    try {
      const res = await fetch(`/api/v1/reconciliation?${params.toString()}`)
      const json = (await res.json().catch(() => ({}))) as ApiResponse
      if (!res.ok) throw new Error(json.error ?? 'Falha ao carregar reconciliação')
      setItems(json.data ?? [])
      setTotal(json.pagination?.total ?? 0)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao carregar reconciliação'
      setError(message)
      setItems([])
      setTotal(0)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [page, status])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const counts = useMemo(() => ({
    matched: items.filter((item) => item.status === 'matched').length,
    unmatched: items.filter((item) => item.status === 'unmatched').length,
    disputed: items.filter((item) => item.status === 'disputed').length,
  }), [items])

  async function handleSync() {
    setIsSyncing(true)
    try {
      const res = await fetch('/api/v1/reconciliation/sync', { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Falha ao sincronizar reconciliação')
      const created = Number(json.data?.created ?? 0)
      toast.success(created > 0 ? `${created} item(ns) detectados` : 'Nenhum novo item detectado')
      await fetchItems()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tToast('analytics.recon_sync_failed'))
    } finally {
      setIsSyncing(false)
    }
  }

  async function handleResolve(item: ReconciliationRow) {
    try {
      const res = await fetch(`/api/v1/reconciliation/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: true, notes: 'Resolvido pela tela de reconciliação' }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Falha ao resolver item')
      toast.success(tToast('analytics.item_matched'))
      await fetchItems()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tToast('analytics.resolve_item_failed'))
    }
  }

  function renderRow(item: ReconciliationRow) {
    const leadHref = item.leadId ? `/${locale}/leads/${item.leadId}` : null
    const themeHref = item.theme ? `/${locale}/themes/${item.theme.id}` : null

    return (
      <li key={item.id} className="rounded-lg border border-border bg-background p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={STATUS_VARIANT[item.status]}>{STATUS_LABELS[item.status]}</Badge>
              <span className="text-sm font-medium text-foreground">{TYPE_LABELS[item.type]}</span>
              <span className="text-xs text-muted-foreground">Semana {formatDate(item.weekOf, locale)}</span>
            </div>
            <p className="text-sm text-muted-foreground">{item.matchingLabel}</p>
            <div className="flex flex-wrap gap-2 text-xs">
              {leadHref ? (
                <Link className="rounded bg-muted px-2 py-1 text-foreground hover:bg-muted/80" href={leadHref}>
                  Lead: {item.leadName ?? item.leadId?.slice(0, 8)}
                </Link>
              ) : (
                <span className="rounded bg-muted px-2 py-1 text-muted-foreground">Sem lead associado</span>
              )}
              {themeHref ? (
                <Link className="rounded bg-muted px-2 py-1 text-foreground hover:bg-muted/80" href={themeHref}>
                  Tema: {item.theme?.title}
                </Link>
              ) : (
                <span className="rounded bg-muted px-2 py-1 text-muted-foreground">Sem tema origem</span>
              )}
              <span className="rounded bg-muted px-2 py-1 text-muted-foreground">
                Conversões: {item.conversionCount}
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleResolve(item)}
            disabled={item.status === 'matched'}
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Marcar matched
          </Button>
        </div>
      </li>
    )
  }

  function renderPanel(type: ReconciliationType, title: string, description: string) {
    const panelItems = getPanelItems(items, type)

    return (
      <section className="space-y-3" aria-labelledby={`${type}-heading`}>
        <div>
          <h2 id={`${type}-heading`} className="text-base font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        {isLoading ? (
          <div className="space-y-3" aria-busy="true" aria-label={`Carregando ${title}`}>
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-lg border border-border bg-muted/40" />
            ))}
          </div>
        ) : panelItems.length > 0 ? (
          <ul className="space-y-3">{panelItems.map(renderRow)}</ul>
        ) : (
          <EmptyState
            icon={<SearchX className="h-10 w-10" aria-hidden />}
            title="Nada para revisar"
            description="Não há eventos neste painel para os filtros atuais."
            className="rounded-lg border border-border"
          />
        )}
      </section>
    )
  }

  return (
    <div className="space-y-6" data-testid="reconciliation-page-client">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card variant="surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Matched</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-semibold">{counts.matched}</p></CardContent>
        </Card>
        <Card variant="surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Unmatched</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-semibold">{counts.unmatched}</p></CardContent>
        </Card>
        <Card variant="surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Disputed</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-semibold">{counts.disputed}</p></CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-end sm:justify-between">
        <Select
          label="Status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value)
            setPage(1)
          }}
          options={STATUS_OPTIONS}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={fetchItems} disabled={isLoading}>
            <RefreshCw className="h-4 w-4" aria-hidden />
            Recarregar
          </Button>
          <Button type="button" onClick={handleSync} isLoading={isSyncing} loadingText="Sincronizando">
            <GitCompareArrows className="h-4 w-4" aria-hidden />
            Sincronizar
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger" role="alert">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        {renderPanel(
          'click_without_conversion',
          'Posts com cliques sem conversão',
          'Eventos de funil com tráfego atribuído, mas sem conversão associada.'
        )}
        {renderPanel(
          'conversion_without_post',
          'Conversões sem post',
          'Conversões que precisam de conferência de tema e origem.'
        )}
      </div>

      <Pagination total={total} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
    </div>
  )
}
