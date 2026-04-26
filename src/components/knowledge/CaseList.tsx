'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, FolderOpen, AlertTriangle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { SkeletonCard } from '@/components/ui/skeleton'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState } from '@/components/shared/empty-state'
import { CaseCard } from './CaseCard'
import { CaseDeleteModal } from './CaseDeleteModal'
import { useKnowledgeList } from '@/hooks/useKnowledgeList'
import type { CaseResponse } from '@/lib/dtos/case-library.dto'

interface CaseListProps {
  locale: string
}

const PAGE_SIZE = 20

export function CaseList({ locale }: CaseListProps) {
  const t = useTranslations()
  const [statusFilter, setStatusFilter] = useState('')

  const STATUS_OPTIONS = [
    { value: '', label: t('knowledge.caseList.all') },
    { value: 'DRAFT', label: t('knowledge.caseList.draft') },
    { value: 'VALIDATED', label: t('knowledge.caseList.published') },
  ]

  const {
    items: cases,
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
  } = useKnowledgeList<CaseResponse>({
    endpoint: '/api/knowledge/cases',
    pageSize: PAGE_SIZE,
    filters: { status: statusFilter },
  })

  // Reset page when filter changes
  useEffect(() => {
    setPage(1)
  }, [statusFilter, setPage])

  return (
    <div data-testid="case-list" className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label={t('common.filter')}
          className="w-full sm:w-48"
          data-testid="case-filter-status"
        />

        <Button asChild data-testid="case-new-button">
          <Link href={`/${locale}/knowledge/cases/new`}>
            <Plus className="h-4 w-4" aria-hidden />
            {t('knowledge.caseList.new')}
          </Link>
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
          <Button variant="ghost" size="sm" onClick={refresh} className="ml-auto">
            {t('common.retry')}
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
          title={t('knowledge.caseList.empty')}
          description={
            statusFilter
              ? t('knowledge.caseList.emptyFilter')
              : t('knowledge.caseList.emptyFirst')
          }
          ctaLabel={!statusFilter ? t('knowledge.caseList.createFirst') : undefined}
          ctaHref={!statusFilter ? `/${locale}/knowledge/cases/new` : undefined}
        />
      )}

      {/* Cases grid */}
      {!isLoading && !error && cases.length > 0 && (
        <>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {cases.map((c) => (
              // content-visibility:auto — FE-023: skip off-screen rendering for long lists
              <div key={c.id} className="[content-visibility:auto] [contain-intrinsic-size:0_280px]">
                <CaseCard
                  caseData={c}
                  locale={locale}
                  onDelete={() => setDeleteTarget(c)}
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

      {/* Delete confirmation modal */}
      <CaseDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() =>
          handleDelete({
            itemId: deleteTarget!.id,
            getLabel: (c) => c.name,
            successMessage: (label) => t('knowledge.caseList.deleteSuccess', { name: label }),
            errorMessage: t('knowledge.caseList.deleteError'),
          })
        }
        caseName={deleteTarget?.name ?? ''}
        isDeleting={isDeleting}
      />
    </div>
  )
}
