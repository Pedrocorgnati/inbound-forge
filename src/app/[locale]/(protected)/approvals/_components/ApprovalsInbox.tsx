'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/select'
import { SkeletonCard } from '@/components/ui/skeleton'
import { apiClient } from '@/lib/api-client'
import { ApprovalCard, type ApprovalItem } from './ApprovalCard'

type ApprovalTypeFilter = 'all' | ApprovalItem['type']
type ApprovalPriorityFilter = 'all' | ApprovalItem['priority']
type ApprovalAgeFilter = 'all' | '24h' | '7d' | '30d'

type ApprovalsResponse = {
  success: boolean
  data?: {
    items: ApprovalItem[]
    totals: Record<ApprovalTypeFilter, number>
  }
  error?: string
}

const TYPE_OPTIONS = [
  { value: 'all', label: 'Todos os tipos' },
  { value: 'theme', label: 'Temas' },
  { value: 'content', label: 'Conteúdos' },
  { value: 'post', label: 'Posts' },
  { value: 'blog', label: 'Blog' },
]

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'Todas as criticidades' },
  { value: 'critical', label: 'Crítica' },
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Média' },
  { value: 'low', label: 'Baixa' },
]

const AGE_OPTIONS = [
  { value: 'all', label: 'Todas as idades' },
  { value: '24h', label: 'Últimas 24 h' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
]

interface ApprovalsInboxProps {
  locale: string
}

export function ApprovalsInbox({ locale }: ApprovalsInboxProps) {
  const router = useRouter()
  const tToast = useTranslations('toasts')
  const [type, setType] = useState<ApprovalTypeFilter>('all')
  const [priority, setPriority] = useState<ApprovalPriorityFilter>('all')
  const [age, setAge] = useState<ApprovalAgeFilter>('all')
  const [items, setItems] = useState<ApprovalItem[]>([])
  const [totals, setTotals] = useState<Record<ApprovalTypeFilter, number>>({
    all: 0,
    theme: 0,
    content: 0,
    post: 0,
    blog: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingApproval, setPendingApproval] = useState<ApprovalItem | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)

  const query = useMemo(() => {
    const params = new URLSearchParams({ type, priority, age, limit: '50' })
    return params.toString()
  }, [age, priority, type])

  const loadApprovals = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/v1/approvals?${query}`, {
        cache: 'no-store',
        credentials: 'include',
      })
      const payload = (await response.json().catch(() => null)) as ApprovalsResponse | null
      if (!response.ok || !payload?.success || !payload.data) {
        throw new Error(payload?.error ?? 'Falha ao carregar aprovações.')
      }
      setItems(payload.data.items)
      setTotals(payload.data.totals)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar aprovações.')
      setItems([])
      setTotals({ all: 0, theme: 0, content: 0, post: 0, blog: 0 })
    } finally {
      setIsLoading(false)
    }
  }, [query])

  useEffect(() => {
    void loadApprovals()
  }, [loadApprovals])

  function detailHref(item: ApprovalItem) {
    return `/${locale}${item.detail_href}`
  }

  async function confirmApproval() {
    if (!pendingApproval) return

    const item = pendingApproval
    setApprovingId(`${item.type}:${item.id}`)
    try {
      const response = await apiClient(item.approve.endpoint, {
        method: item.approve.method,
        headers: item.approve.body ? { 'content-type': 'application/json' } : undefined,
        body: item.approve.body ? JSON.stringify(item.approve.body) : undefined,
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error ?? payload?.message ?? `HTTP ${response.status}`)
      }
      toast.success(tToast('approvals.registered'))
      setPendingApproval(null)
      router.push(detailHref(item))
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tToast('approvals.approve_failed'))
    } finally {
      setApprovingId(null)
    }
  }

  function clearFilters() {
    setType('all')
    setPriority('all')
    setAge('all')
  }

  const hasFilters = type !== 'all' || priority !== 'all' || age !== 'all'

  return (
    <div className="space-y-6" data-testid="approvals-inbox">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Aprovações</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Inbox unificada para temas, conteúdos, posts e artigos aguardando decisão humana.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void loadApprovals()} disabled={isLoading}>
          <RefreshCw className="h-4 w-4" aria-hidden />
          Atualizar
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Select
          label="Tipo"
          value={type}
          options={TYPE_OPTIONS}
          onChange={(event) => setType(event.target.value as ApprovalTypeFilter)}
        />
        <Select
          label="Criticidade"
          value={priority}
          options={PRIORITY_OPTIONS}
          onChange={(event) => setPriority(event.target.value as ApprovalPriorityFilter)}
        />
        <Select
          label="Idade"
          value={age}
          options={AGE_OPTIONS}
          onChange={(event) => setAge(event.target.value as ApprovalAgeFilter)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{totals.all} pendente{totals.all === 1 ? '' : 's'}</span>
        <span>Temas {totals.theme}</span>
        <span>Conteúdos {totals.content}</span>
        <span>Posts {totals.post}</span>
        <span>Blog {totals.blog}</span>
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-md border border-danger/20 bg-danger/10 p-4 sm:flex-row sm:items-center"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-danger">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void loadApprovals()}>
            <RefreshCw className="h-4 w-4" aria-hidden />
            Tentar novamente
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="space-y-3" data-testid="approvals-loading">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      )}

      {!isLoading && !error && items.length === 0 && (
        <EmptyState
          icon={<Inbox className="h-12 w-12" aria-hidden />}
          title={hasFilters ? 'Nenhuma aprovação encontrada' : 'Inbox vazia'}
          description={
            hasFilters
              ? 'Ajuste os filtros para ver outros itens pendentes.'
              : 'Quando houver temas, conteúdos, posts ou artigos aguardando aprovação, eles aparecerão aqui.'
          }
          actionLabel={hasFilters ? 'Limpar filtros' : undefined}
          onAction={hasFilters ? clearFilters : undefined}
        />
      )}

      {!isLoading && !error && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => (
            <ApprovalCard
              key={`${item.type}:${item.id}`}
              item={item}
              isApproving={approvingId === `${item.type}:${item.id}`}
              onApprove={setPendingApproval}
              onOpenDetail={(target) => router.push(detailHref(target))}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingApproval)}
        onOpenChange={(open) => {
          if (!open && !approvingId) setPendingApproval(null)
        }}
        title="Confirmar aprovação"
        description={
          pendingApproval
            ? `Aprovar "${pendingApproval.title}" e abrir o detalhe do item?`
            : 'Confirmar aprovação?'
        }
        confirmLabel="Aprovar"
        cancelLabel="Cancelar"
        variant="default"
        onConfirm={confirmApproval}
      />
    </div>
  )
}
