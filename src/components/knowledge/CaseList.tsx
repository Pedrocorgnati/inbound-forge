'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, FolderOpen, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { SkeletonCard } from '@/components/ui/skeleton'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState } from '@/components/shared/empty-state'
import { toast } from '@/components/ui/toast'
import { CaseCard } from './CaseCard'
import { CaseDeleteModal } from './CaseDeleteModal'
import type { CaseResponse } from '@/lib/dtos/case-library.dto'

interface CaseListProps {
  locale: string
}

interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'DRAFT', label: 'Rascunho' },
  { value: 'VALIDATED', label: 'Publicado' },
]

const PAGE_SIZE = 20

export function CaseList({ locale }: CaseListProps) {
  const router = useRouter()

  const [cases, setCases] = useState<CaseResponse[]>([])
  const [pagination, setPagination] = useState<PaginationData | null>(null)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<CaseResponse | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchCases = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
    })
    if (statusFilter) {
      params.set('status', statusFilter)
    }

    try {
      const res = await fetch(`/api/knowledge/cases?${params}`)
      if (!res.ok) throw new Error('Falha ao carregar cases')

      const json = await res.json()
      setCases(json.data ?? [])
      setPagination(json.pagination ?? null)
    } catch {
      setError('Não foi possível carregar os cases. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    fetchCases()
  }, [fetchCases])

  // Reset page when filter changes
  useEffect(() => {
    setPage(1)
  }, [statusFilter])

  async function handleDelete() {
    if (!deleteTarget) return

    const removedCase = deleteTarget
    const previousCases = [...cases]

    // Optimistic removal
    setCases((prev) => prev.filter((c) => c.id !== removedCase.id))
    setDeleteTarget(null)
    setIsDeleting(true)

    try {
      const res = await fetch(`/api/knowledge/cases/${removedCase.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Falha ao deletar')

      toast.success(`Case "${removedCase.name}" deletado`)

      // Adjust pagination total
      if (pagination) {
        setPagination((prev) =>
          prev ? { ...prev, total: prev.total - 1 } : prev
        )
      }
    } catch {
      // Rollback
      setCases(previousCases)
      toast.error('Erro ao deletar case. Tente novamente.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div data-testid="case-list" className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filtrar por status"
          className="w-full sm:w-48"
          data-testid="case-filter-status"
        />

        <Button
          onClick={() => router.push(`/${locale}/knowledge/cases/new`)}
          data-testid="case-new-button"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Novo Case
        </Button>
      </div>

      {/* Error state */}
      {error && !isLoading && (
        <div
          className="flex items-center gap-2 rounded-md border border-danger/20 bg-danger/10 px-4 py-3"
          role="alert"
          data-testid="case-list-error"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-danger" aria-hidden />
          <p className="text-sm text-danger">{error}</p>
          <Button variant="ghost" size="sm" onClick={fetchCases} className="ml-auto">
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div
          className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          data-testid="case-list-loading"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && cases.length === 0 && (
        <EmptyState
          icon={<FolderOpen className="h-12 w-12" />}
          title="Nenhum case encontrado"
          description={
            statusFilter
              ? 'Nenhum case encontrado com este filtro. Tente outro status.'
              : 'Comece adicionando seu primeiro case de sucesso para alimentar a base de conhecimento.'
          }
          ctaLabel={!statusFilter ? 'Criar primeiro case' : undefined}
          onCtaClick={
            !statusFilter
              ? () => router.push(`/${locale}/knowledge/cases/new`)
              : undefined
          }
        />
      )}

      {/* Cases grid */}
      {!isLoading && !error && cases.length > 0 && (
        <>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {cases.map((c) => (
              <CaseCard
                key={c.id}
                caseData={c}
                locale={locale}
                onDelete={() => setDeleteTarget(c)}
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

      {/* Delete confirmation modal */}
      <CaseDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        caseName={deleteTarget?.name ?? ''}
        isDeleting={isDeleting}
      />
    </div>
  )
}
