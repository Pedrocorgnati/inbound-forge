'use client'

import { useEffect, useState } from 'react'
import { Plus, FolderOpen, AlertTriangle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { SkeletonCard } from '@/components/ui/skeleton'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState } from '@/components/shared/empty-state'
import { PainCard } from './PainCard'
import { PainForm } from './PainForm'
import { PainDeleteModal } from './PainDeleteModal'
import { CasePainLinkModal } from './CasePainLinkModal'
import { useKnowledgeList } from '@/hooks/useKnowledgeList'
import { SECTOR_FILTER_OPTIONS } from '@/constants/knowledge'
import type { PainResponse } from '@/lib/dtos/pain-library.dto'

interface PainListProps {
  locale: string
}

const PAGE_SIZE = 20

export function PainList({ locale }: PainListProps) {
  const t = useTranslations()
  const [sectorFilter, setSectorFilter] = useState('')

  const {
    items: pains,
    pagination,
    page,
    isLoading,
    error,
    deleteTarget,
    isDeleting,
    setPage,
    setDeleteTarget,
    refresh,
    handleDelete,
  } = useKnowledgeList<PainResponse>({
    endpoint: '/api/knowledge/pains',
    pageSize: PAGE_SIZE,
    filters: { sector: sectorFilter },
  })

  // Form modal state
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [formTarget, setFormTarget] = useState<PainResponse | undefined>(undefined)
  const [isFormOpen, setIsFormOpen] = useState(false)

  // Link modal state
  const [linkTarget, setLinkTarget] = useState<PainResponse | null>(null)

  // Reset page when filter changes
  useEffect(() => {
    setPage(1)
  }, [sectorFilter, setPage])

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

  return (
    <div data-testid="pain-list" className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select
          options={[...SECTOR_FILTER_OPTIONS]}
          value={sectorFilter}
          onChange={(e) => setSectorFilter(e.target.value)}
          aria-label={t('knowledge.painList.filterByCategory')}
          className="w-full sm:w-56"
          data-testid="pain-filter-sector"
        />

        <Button
          onClick={openCreateForm}
          data-testid="pain-new-button"
        >
          <Plus className="h-4 w-4" aria-hidden />
          {t('knowledge.painList.new')}
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
          <Button variant="ghost" size="sm" onClick={refresh} className="ml-auto">
            {t('common.retry')}
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
          title={t('knowledge.painList.empty')}
          description={
            sectorFilter
              ? t('knowledge.painList.emptyFilter')
              : t('knowledge.painList.emptyFirst')
          }
          ctaLabel={!sectorFilter ? t('knowledge.painList.createFirst') : undefined}
          onCtaClick={!sectorFilter ? openCreateForm : undefined}
        />
      )}

      {/* Pains grid */}
      {!isLoading && !error && pains.length > 0 && (
        <>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {pains.map((p) => (
              <div key={p.id} className="[content-visibility:auto] [contain-intrinsic-size:0_260px]">
                <PainCard
                  pain={p}
                  locale={locale}
                  onEdit={() => openEditForm(p)}
                  onDelete={() => setDeleteTarget(p)}
                  onLinkCases={() => setLinkTarget(p)}
                />
              </div>
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
        onSuccess={refresh}
        locale={locale}
      />

      {/* Delete confirmation modal */}
      <PainDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() =>
          handleDelete({
            itemId: deleteTarget!.id,
            getLabel: (p) => p.title,
            successMessage: (label) => t('knowledge.painList.deleteSuccess', { name: label }),
            errorMessage: t('knowledge.painList.deleteError'),
          })
        }
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
          onSuccess={refresh}
        />
      )}
    </div>
  )
}
