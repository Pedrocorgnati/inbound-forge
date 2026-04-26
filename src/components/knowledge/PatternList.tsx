'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, FolderOpen, AlertTriangle, Pencil, Trash2, Link2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { SkeletonCard } from '@/components/ui/skeleton'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState } from '@/components/shared/empty-state'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PatternForm } from './PatternForm'
import { PatternDeleteModal } from './PatternDeleteModal'
import { useKnowledgeList } from '@/hooks/useKnowledgeList'
import type { PatternResponse } from '@/lib/dtos/solution-pattern.dto'
import type { PainResponse } from '@/lib/dtos/pain-library.dto'

interface PatternListProps {
  locale: string
}

const PAGE_SIZE = 20

function snippet(text: string, maxLen = 80): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen).trimEnd() + '...'
}

export function PatternList({ locale }: PatternListProps) {
  const t = useTranslations()

  const {
    items: patterns,
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
  } = useKnowledgeList<PatternResponse>({
    endpoint: '/api/knowledge/patterns',
    pageSize: PAGE_SIZE,
  })

  // Pain name cache for display
  const [painMap, setPainMap] = useState<Record<string, string>>({})

  // Form modal state
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [formTarget, setFormTarget] = useState<PatternResponse | undefined>(undefined)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const fetchPainNames = useCallback(async () => {
    try {
      const res = await fetch('/api/knowledge/pains?limit=100')
      if (!res.ok) return
      const json = await res.json()
      const map: Record<string, string> = {}
      for (const p of (json.data ?? []) as PainResponse[]) {
        map[p.id] = p.title
      }
      setPainMap(map)
    } catch {
      // Non-critical, fail silently
    }
  }, [])

  useEffect(() => {
    fetchPainNames()
  }, [fetchPainNames])

  function openCreateForm() {
    setFormMode('create')
    setFormTarget(undefined)
    setIsFormOpen(true)
  }

  function openEditForm(pattern: PatternResponse) {
    setFormMode('edit')
    setFormTarget(pattern)
    setIsFormOpen(true)
  }

  return (
    <div data-testid="pattern-list" className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button
          onClick={openCreateForm}
          data-testid="pattern-new-button"
        >
          <Plus className="h-4 w-4" aria-hidden />
          {t('knowledge.patternList.new')}
        </Button>
      </div>

      {/* Error state */}
      {error && !isLoading && (
        <div
          className="flex items-center gap-2 rounded-md border border-danger/20 bg-danger/10 px-4 py-3"
          role="alert"
          data-testid="pattern-list-error"
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
          data-testid="pattern-list-loading"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && patterns.length === 0 && (
        <EmptyState
          icon={<FolderOpen className="h-12 w-12" />}
          title={t('knowledge.patternList.empty')}
          description={t('knowledge.patternList.emptyFirst')}
          ctaLabel={t('knowledge.patternList.createFirst')}
          onCtaClick={openCreateForm}
        />
      )}

      {/* Patterns grid */}
      {!isLoading && !error && patterns.length > 0 && (
        <>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {patterns.map((p) => (
              <div key={p.id} className="[content-visibility:auto] [contain-intrinsic-size:0_260px]">
              <Card variant="elevated" data-testid={`pattern-card-${p.id}`}>
                <CardHeader>
                  {/* Intake Review TASK-8 ST006 (CL-224): title vira link para detalhe */}
                  <CardTitle className="text-base leading-snug">
                    <Link
                      href={`/${locale}/knowledge/patterns/${p.id}`}
                      className="hover:underline"
                    >
                      {p.name}
                    </Link>
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {snippet(p.description)}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {p.painId && (
                      <Badge variant="warning">
                        <Link2 className="h-3 w-3" aria-hidden />
                        {painMap[p.painId] ?? t('knowledge.patternList.linkedPain')}
                      </Badge>
                    )}
                    {p.caseId && (
                      <Badge variant="info">{t('knowledge.patternList.linkedCase')}</Badge>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditForm(p)}
                    data-testid={`pattern-edit-${p.id}`}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                    {t('common.edit')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget(p)}
                    className="text-danger hover:text-danger hover:bg-danger/10"
                    data-testid={`pattern-delete-${p.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    {t('common.delete')}
                  </Button>
                </CardFooter>
              </Card>
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

      {/* Pattern form modal (create/edit) */}
      <PatternForm
        mode={formMode}
        initialData={formTarget}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={() => {
          refresh()
          fetchPainNames()
        }}
        locale={locale}
      />

      {/* Delete confirmation modal */}
      <PatternDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() =>
          handleDelete({
            itemId: deleteTarget!.id,
            getLabel: (p) => p.name,
            successMessage: (label) => t('knowledge.patternList.deleteSuccess', { name: label }),
            errorMessage: t('knowledge.patternList.deleteError'),
          })
        }
        patternName={deleteTarget?.name ?? ''}
        isDeleting={isDeleting}
      />
    </div>
  )
}
