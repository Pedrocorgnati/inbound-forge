'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, FolderOpen, AlertTriangle, Pencil, Trash2, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SkeletonCard } from '@/components/ui/skeleton'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState } from '@/components/shared/empty-state'
import { toast } from '@/components/ui/toast'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PatternForm } from './PatternForm'
import { PatternDeleteModal } from './PatternDeleteModal'
import type { PatternResponse } from '@/lib/dtos/solution-pattern.dto'
import type { PainResponse } from '@/lib/dtos/pain-library.dto'

interface PatternListProps {
  locale: string
}

interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
}

const PAGE_SIZE = 20

function snippet(text: string, maxLen = 80): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen).trimEnd() + '...'
}

export function PatternList({ locale }: PatternListProps) {
  const [patterns, setPatterns] = useState<PatternResponse[]>([])
  const [pagination, setPagination] = useState<PaginationData | null>(null)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Pain name cache for display
  const [painMap, setPainMap] = useState<Record<string, string>>({})

  // Form modal state
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [formTarget, setFormTarget] = useState<PatternResponse | undefined>(undefined)
  const [isFormOpen, setIsFormOpen] = useState(false)

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<PatternResponse | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchPatterns = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
    })

    try {
      const res = await fetch(`/api/knowledge/patterns?${params}`)
      if (!res.ok) throw new Error('Falha ao carregar padrões')

      const json = await res.json()
      setPatterns(json.data ?? [])
      setPagination(json.pagination ?? null)
    } catch {
      setError('Não foi possível carregar os padrões. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }, [page])

  // Fetch pain names for display
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
    fetchPatterns()
    fetchPainNames()
  }, [fetchPatterns, fetchPainNames])

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

  async function handleDelete() {
    if (!deleteTarget) return

    const removedPattern = deleteTarget
    const previousPatterns = [...patterns]

    // Optimistic removal
    setPatterns((prev) => prev.filter((p) => p.id !== removedPattern.id))
    setDeleteTarget(null)
    setIsDeleting(true)

    try {
      const res = await fetch(`/api/knowledge/patterns/${removedPattern.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Falha ao deletar')

      toast.success(`Padrão "${removedPattern.name}" deletado`)

      if (pagination) {
        setPagination((prev) =>
          prev ? { ...prev, total: prev.total - 1 } : prev
        )
      }
    } catch {
      // Rollback
      setPatterns(previousPatterns)
      toast.error('Erro ao deletar padrão. Tente novamente.')
    } finally {
      setIsDeleting(false)
    }
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
          Novo Padrão
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
          <Button variant="ghost" size="sm" onClick={fetchPatterns} className="ml-auto">
            Tentar novamente
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
          title="Nenhum padrão encontrado"
          description="Comece adicionando seu primeiro padrão de solução para alimentar a base de conhecimento."
          ctaLabel="Criar primeiro padrão"
          onCtaClick={openCreateForm}
        />
      )}

      {/* Patterns grid */}
      {!isLoading && !error && patterns.length > 0 && (
        <>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {patterns.map((p) => (
              <Card key={p.id} variant="elevated" data-testid={`pattern-card-${p.id}`}>
                <CardHeader>
                  <CardTitle className="text-base leading-snug">{p.name}</CardTitle>
                </CardHeader>

                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {snippet(p.description)}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {p.painId && (
                      <Badge variant="warning">
                        <Link2 className="h-3 w-3" aria-hidden />
                        {painMap[p.painId] ?? 'Dor vinculada'}
                      </Badge>
                    )}
                    {p.caseId && (
                      <Badge variant="info">Case vinculado</Badge>
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
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget(p)}
                    className="text-danger hover:text-danger hover:bg-danger/10"
                    data-testid={`pattern-delete-${p.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    Deletar
                  </Button>
                </CardFooter>
              </Card>
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
          fetchPatterns()
          fetchPainNames()
        }}
        locale={locale}
      />

      {/* Delete confirmation modal */}
      <PatternDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        patternName={deleteTarget?.name ?? ''}
        isDeleting={isDeleting}
      />
    </div>
  )
}
