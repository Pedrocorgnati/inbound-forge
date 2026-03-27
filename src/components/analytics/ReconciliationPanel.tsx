'use client'

// ReconciliationPanel — painel de reconciliação de dados de analytics
// INT-106 | PERF-002: paginação | COMP-001: auditLog via API | SEC-008: sem PII

import React, { useCallback, useEffect, useState } from 'react'
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/empty-state'
import { ReconciliationItem, type ReconciliationItemData } from './ReconciliationItem'

type FilterMode = 'pending' | 'all'

const PAGE_LIMIT = 20

function SkeletonRow() {
  return (
    <div className="flex items-start gap-3 rounded-md border border-border p-3">
      <div className="mt-0.5 h-4 w-4 animate-pulse rounded-full bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-40 animate-pulse rounded bg-muted" />
        <div className="h-3 w-64 animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
}

export function ReconciliationPanel() {
  const [filter, setFilter] = useState<FilterMode>('pending')
  const [items, setItems] = useState<ReconciliationItemData[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)

  const totalPages = Math.ceil(total / PAGE_LIMIT)

  const fetchItems = useCallback(async (filterMode: FilterMode, currentPage: number) => {
    setIsLoading(true)
    try {
      const resolved = filterMode === 'all' ? undefined : false
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(PAGE_LIMIT),
      })
      if (resolved !== undefined) params.set('resolved', String(resolved))

      const res = await fetch(`/api/v1/reconciliation?${params}`)
      if (!res.ok) throw new Error('Erro ao carregar itens')
      const json = await res.json()
      setItems(json.data ?? [])
      setTotal(json.meta?.total ?? 0)
    } catch {
      toast.error('Erro ao carregar painel de reconciliação')
      setItems([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchItems(filter, page)
  }, [fetchItems, filter, page])

  function handleFilterChange(mode: FilterMode) {
    setFilter(mode)
    setPage(1)
  }

  function handleResolved(id: string) {
    if (filter === 'pending') {
      // Remove do painel de pendentes — optimistic
      setItems((prev) => prev.filter((i) => i.id !== id))
      setTotal((t) => Math.max(0, t - 1))
    } else {
      // Marca como resolved inline
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, resolved: true } : i)))
    }
  }

  function handleDeleted(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
    setTotal((t) => Math.max(0, t - 1))
  }

  async function handleSync() {
    setIsSyncing(true)
    try {
      const res = await fetch('/api/v1/reconciliation/sync', { method: 'POST' })
      if (!res.ok) throw new Error('Erro na sincronização')
      const json = await res.json()
      const created: number = json.data?.created ?? 0
      toast.success(
        created > 0
          ? `${created} novo${created > 1 ? 's itens detectados' : ' item detectado'}`
          : 'Nenhum novo item encontrado'
      )
      // Recarregar lista após sync
      fetchItems(filter, page)
    } catch {
      toast.error('Erro ao sincronizar reconciliação')
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <section
      className="rounded-lg border border-border bg-surface"
      aria-label="Painel de reconciliação"
      data-testid="reconciliation-panel"
    >
      {/* Cabeçalho */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-500" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-foreground">Reconciliação de Dados</h2>
          {total > 0 && !isLoading && (
            <span
              className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              aria-label={`${total} itens`}
            >
              {total}
            </span>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={handleSync}
          disabled={isSyncing}
          aria-label="Sincronizar e detectar novos itens"
        >
          <RefreshCw
            className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          {isSyncing ? 'Sincronizando…' : 'Sincronizar'}
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-1 border-b border-border px-4 py-2">
        <button
          type="button"
          onClick={() => handleFilterChange('pending')}
          className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
            filter === 'pending'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          aria-pressed={filter === 'pending'}
        >
          Pendentes
        </button>
        <button
          type="button"
          onClick={() => handleFilterChange('all')}
          className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
            filter === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          aria-pressed={filter === 'all'}
        >
          Todos
        </button>
      </div>

      {/* Lista */}
      <div className="p-4">
        {isLoading ? (
          <div className="space-y-2" aria-busy="true" aria-label="Carregando itens…">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<CheckCircle className="h-8 w-8 text-green-500" />}
            title={filter === 'pending' ? 'Nenhum item pendente' : 'Nenhum item encontrado'}
            description={
              filter === 'pending'
                ? 'Todos os itens foram reconciliados.'
                : 'Execute uma sincronização para detectar discrepâncias.'
            }
          />
        ) : (
          <div className="space-y-2" role="list" aria-label="Itens de reconciliação">
            {items.map((item) => (
              <div key={item.id} role="listitem">
                <ReconciliationItem
                  item={item}
                  onResolved={handleResolved}
                  onDeleted={handleDeleted}
                />
              </div>
            ))}
          </div>
        )}

        {/* Paginação */}
        {!isLoading && totalPages > 1 && (
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {items.length} de {total} itens
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="h-7 text-xs"
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-7 text-xs"
              >
                Próximo
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
