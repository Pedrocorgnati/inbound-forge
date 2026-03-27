'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, FolderOpen, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { SkeletonCard } from '@/components/ui/skeleton'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState } from '@/components/shared/empty-state'
import { toast } from '@/components/ui/toast'
import { PainCard } from './PainCard'
import { PainForm } from './PainForm'
import { PainDeleteModal } from './PainDeleteModal'
import { CasePainLinkModal } from './CasePainLinkModal'
import type { PainResponse } from '@/lib/dtos/pain-library.dto'

interface PainListProps {
  locale: string
}

interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
}

const SECTOR_OPTIONS = [
  { value: '', label: 'Todas as categorias' },
  { value: 'operational_time', label: 'Tempo Operacional' },
  { value: 'spreadsheet_dependency', label: 'Dependência de Planilhas' },
  { value: 'systems_integration', label: 'Integração de Sistemas' },
  { value: 'manual_budgeting', label: 'Orçamento Manual' },
  { value: 'visibility_dashboards', label: 'Visibilidade / Dashboards' },
  { value: 'slow_customer_service', label: 'Atendimento Lento' },
  { value: 'scaling_difficulty', label: 'Dificuldade de Escalar' },
  { value: 'low_predictability', label: 'Baixa Previsibilidade' },
  { value: 'human_errors', label: 'Erros Humanos' },
  { value: 'ad_hoc_operation', label: 'Operação Ad-hoc' },
]

const PAGE_SIZE = 20

export function PainList({ locale }: PainListProps) {
  const [pains, setPains] = useState<PainResponse[]>([])
  const [pagination, setPagination] = useState<PaginationData | null>(null)
  const [page, setPage] = useState(1)
  const [sectorFilter, setSectorFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form modal state
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [formTarget, setFormTarget] = useState<PainResponse | undefined>(undefined)
  const [isFormOpen, setIsFormOpen] = useState(false)

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<PainResponse | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Link modal state
  const [linkTarget, setLinkTarget] = useState<PainResponse | null>(null)

  const fetchPains = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
    })
    if (sectorFilter) {
      params.set('sector', sectorFilter)
    }

    try {
      const res = await fetch(`/api/knowledge/pains?${params}`)
      if (!res.ok) throw new Error('Falha ao carregar dores')

      const json = await res.json()
      setPains(json.data ?? [])
      setPagination(json.pagination ?? null)
    } catch {
      setError('Não foi possível carregar as dores. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }, [page, sectorFilter])

  useEffect(() => {
    fetchPains()
  }, [fetchPains])

  // Reset page when filter changes
  useEffect(() => {
    setPage(1)
  }, [sectorFilter])

  function openCreateForm() {
    setFormMode('create')
    setFormTarget(undefined)
    setIsFormOpen(true)
  }

  function openEditForm(pain: PainResponse) {
    setFormMode('edit')
    setFormTarget(pain)
    setIsFormOpen(true)
  }

  async function handleDelete() {
    if (!deleteTarget) return

    const removedPain = deleteTarget
    const previousPains = [...pains]

    // Optimistic removal
    setPains((prev) => prev.filter((p) => p.id !== removedPain.id))
    setDeleteTarget(null)
    setIsDeleting(true)

    try {
      const res = await fetch(`/api/knowledge/pains/${removedPain.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Falha ao deletar')

      toast.success(`Dor "${removedPain.title}" deletada`)

      if (pagination) {
        setPagination((prev) =>
          prev ? { ...prev, total: prev.total - 1 } : prev
        )
      }
    } catch {
      // Rollback
      setPains(previousPains)
      toast.error('Erro ao deletar dor. Tente novamente.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div data-testid="pain-list" className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select
          options={SECTOR_OPTIONS}
          value={sectorFilter}
          onChange={(e) => setSectorFilter(e.target.value)}
          aria-label="Filtrar por categoria"
          className="w-full sm:w-56"
          data-testid="pain-filter-sector"
        />

        <Button
          onClick={openCreateForm}
          data-testid="pain-new-button"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Nova Dor
        </Button>
      </div>

      {/* Error state */}
      {error && !isLoading && (
        <div
          className="flex items-center gap-2 rounded-md border border-danger/20 bg-danger/10 px-4 py-3"
          role="alert"
          data-testid="pain-list-error"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-danger" aria-hidden />
          <p className="text-sm text-danger">{error}</p>
          <Button variant="ghost" size="sm" onClick={fetchPains} className="ml-auto">
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div
          className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          data-testid="pain-list-loading"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && pains.length === 0 && (
        <EmptyState
          icon={<FolderOpen className="h-12 w-12" />}
          title="Nenhuma dor encontrada"
          description={
            sectorFilter
              ? 'Nenhuma dor encontrada com este filtro. Tente outra categoria.'
              : 'Comece adicionando sua primeira dor para alimentar a base de conhecimento.'
          }
          ctaLabel={!sectorFilter ? 'Criar primeira dor' : undefined}
          onCtaClick={!sectorFilter ? openCreateForm : undefined}
        />
      )}

      {/* Pains grid */}
      {!isLoading && !error && pains.length > 0 && (
        <>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {pains.map((p) => (
              <PainCard
                key={p.id}
                pain={p}
                locale={locale}
                onEdit={() => openEditForm(p)}
                onDelete={() => setDeleteTarget(p)}
                onLinkCases={() => setLinkTarget(p)}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination && (
            <Pagination
              total={pagination.total}
              page={page}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              className="mt-6"
            />
          )}
        </>
      )}

      {/* Pain form modal (create/edit) */}
      <PainForm
        mode={formMode}
        initialData={formTarget}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchPains}
        locale={locale}
      />

      {/* Delete confirmation modal */}
      <PainDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        painTitle={deleteTarget?.title ?? ''}
        isDeleting={isDeleting}
      />

      {/* Link cases modal */}
      {linkTarget && (
        <CasePainLinkModal
          isOpen={!!linkTarget}
          onClose={() => setLinkTarget(null)}
          painId={linkTarget.id}
          painTitle={linkTarget.title}
          currentCaseIds={[]}
          locale={locale}
          onSuccess={fetchPains}
        />
      )}
    </div>
  )
}
