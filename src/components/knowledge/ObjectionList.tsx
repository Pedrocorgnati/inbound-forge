'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, FolderOpen, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SkeletonCard } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { toast } from '@/components/ui/toast'
import { ObjectionCard } from './ObjectionCard'
import { ObjectionForm } from './ObjectionForm'
import { ObjectionDeleteModal } from './ObjectionDeleteModal'
import type { ObjectionResponse } from '@/lib/dtos/objection.dto'

interface ObjectionListProps {
  locale: string
}

type ObjectionType = 'PRICE' | 'TRUST' | 'TIMING' | 'NEED' | 'AUTHORITY'

const TYPE_SECTIONS: { type: ObjectionType; label: string }[] = [
  { type: 'PRICE', label: 'Objeções de Preço' },
  { type: 'TRUST', label: 'Objeções de Confiança' },
  { type: 'TIMING', label: 'Objeções de Timing' },
  { type: 'NEED', label: 'Objeções de Necessidade' },
  { type: 'AUTHORITY', label: 'Objeções de Autoridade' },
]

export function ObjectionList({ locale }: ObjectionListProps) {
  const [objections, setObjections] = useState<ObjectionResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form modal state
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ObjectionResponse | undefined>(undefined)

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<ObjectionResponse | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchObjections = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/knowledge/objections?limit=100')
      if (!res.ok) throw new Error('Falha ao carregar objeções')

      const json = await res.json()
      setObjections(json.data ?? [])
    } catch {
      setError('Não foi possível carregar as objeções. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchObjections()
  }, [fetchObjections])

  function handleNewObjection() {
    setEditTarget(undefined)
    setFormOpen(true)
  }

  function handleEdit(objection: ObjectionResponse) {
    setEditTarget(objection)
    setFormOpen(true)
  }

  function handleFormSuccess() {
    setFormOpen(false)
    setEditTarget(undefined)
    fetchObjections()
  }

  async function handleDelete() {
    if (!deleteTarget) return

    const removed = deleteTarget
    const previousObjections = [...objections]

    // Optimistic removal
    setObjections((prev) => prev.filter((o) => o.id !== removed.id))
    setDeleteTarget(null)
    setIsDeleting(true)

    try {
      const res = await fetch(`/api/knowledge/objections/${removed.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Falha ao deletar')

      toast.success('Objeção deletada')
    } catch {
      // Rollback
      setObjections(previousObjections)
      toast.error('Erro ao deletar objeção. Tente novamente.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Group objections by type
  const groupedByType = TYPE_SECTIONS.map((section) => ({
    ...section,
    items: objections.filter((o) => o.type === section.type),
  })).filter((section) => section.items.length > 0)

  return (
    <div data-testid="objection-list" className="space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {!isLoading && !error && `${objections.length} objeção(ões) cadastrada(s)`}
        </p>
        <Button
          onClick={handleNewObjection}
          data-testid="objection-new-button"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Nova Objeção
        </Button>
      </div>

      {/* Error state */}
      {error && !isLoading && (
        <div
          className="flex items-center gap-2 rounded-md border border-danger/20 bg-danger/10 px-4 py-3"
          role="alert"
          data-testid="objection-list-error"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-danger" aria-hidden />
          <p className="text-sm text-danger">{error}</p>
          <Button variant="ghost" size="sm" onClick={fetchObjections} className="ml-auto">
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div
          className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          data-testid="objection-list-loading"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && objections.length === 0 && (
        <EmptyState
          icon={<FolderOpen className="h-12 w-12" />}
          title="Nenhuma objeção encontrada"
          description="Comece adicionando objeções comuns dos seus prospects para alimentar a base de conhecimento."
          ctaLabel="Criar primeira objeção"
          onCtaClick={handleNewObjection}
        />
      )}

      {/* Objections grouped by type */}
      {!isLoading && !error && groupedByType.length > 0 && (
        <div className="space-y-8">
          {groupedByType.map((section) => (
            <section key={section.type} data-testid={`objection-section-${section.type.toLowerCase()}`}>
              <h3 className="mb-3 text-base font-semibold text-foreground">
                {section.label}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({section.items.length})
                </span>
              </h3>
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {section.items.map((objection) => (
                  <ObjectionCard
                    key={objection.id}
                    objection={objection}
                    locale={locale}
                    onEdit={handleEdit}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Form modal */}
      <ObjectionForm
        mode={editTarget ? 'edit' : 'create'}
        initialData={editTarget}
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditTarget(undefined)
        }}
        onSuccess={handleFormSuccess}
        locale={locale}
      />

      {/* Delete confirmation modal */}
      <ObjectionDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        objectionContent={deleteTarget?.content ?? ''}
        isDeleting={isDeleting}
      />
    </div>
  )
}
