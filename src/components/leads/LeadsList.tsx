'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Users, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { SkeletonCard } from '@/components/ui/skeleton'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState } from '@/components/shared/empty-state'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import { LeadCard } from './LeadCard'
import type { Lead } from '@/types/leads'

interface LeadsListProps {
  locale: string
  themeId?: string
}

interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
}

const CHANNEL_OPTIONS = [
  { value: '', label: 'Todos os canais' },
  { value: 'BLOG', label: 'Blog' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'INSTAGRAM', label: 'Instagram' },
]

const FUNNEL_OPTIONS = [
  { value: '', label: 'Todos os estágios' },
  { value: 'AWARENESS', label: 'Descoberta' },
  { value: 'CONSIDERATION', label: 'Consideração' },
  { value: 'DECISION', label: 'Decisão' },
]

const PAGE_SIZE = 20

export function LeadsList({ locale, themeId }: LeadsListProps) {
  const router = useRouter()

  const [leads, setLeads] = useState<Lead[]>([])
  const [pagination, setPagination] = useState<PaginationData | null>(null)
  const [page, setPage] = useState(1)
  const [channelFilter, setChannelFilter] = useState('')
  const [funnelFilter, setFunnelFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null)
  const [_isDeleting, setIsDeleting] = useState(false)

  const fetchLeads = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
    })
    if (channelFilter) params.set('channel', channelFilter)
    if (funnelFilter) params.set('funnelStage', funnelFilter)
    if (themeId) params.set('themeId', themeId)

    try {
      const res = await fetch(`/api/v1/leads?${params}`)
      if (!res.ok) throw new Error('Falha ao carregar leads')

      const json = await res.json()
      setLeads(json.data ?? [])
      setPagination(json.pagination ?? null)
    } catch {
      setError('Não foi possível carregar os leads. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }, [page, channelFilter, funnelFilter, themeId])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [channelFilter, funnelFilter])

  async function handleDelete() {
    if (!deleteTarget) return

    const removedLead = deleteTarget
    const previousLeads = [...leads]

    // Optimistic removal
    setLeads((prev) => prev.filter((l) => l.id !== removedLead.id))
    setDeleteTarget(null)
    setIsDeleting(true)

    try {
      const res = await fetch(`/api/v1/leads/${removedLead.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Falha ao excluir')

      toast.success(`Lead "${removedLead.company ?? 'Sem empresa'}" excluído`)

      if (pagination) {
        setPagination((prev) =>
          prev ? { ...prev, total: prev.total - 1 } : prev
        )
      }
    } catch {
      // Rollback
      setLeads(previousLeads)
      toast.error('Erro ao excluir lead. Tente novamente.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div data-testid="leads-list" className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select
            options={CHANNEL_OPTIONS}
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            aria-label="Filtrar por canal"
            className="w-full sm:w-48"
            data-testid="lead-filter-channel"
          />
          <Select
            options={FUNNEL_OPTIONS}
            value={funnelFilter}
            onChange={(e) => setFunnelFilter(e.target.value)}
            aria-label="Filtrar por estágio"
            className="w-full sm:w-48"
            data-testid="lead-filter-funnelStage"
          />
        </div>

        <Button
          onClick={() => router.push(`/${locale}/leads/new`)}
          data-testid="lead-new-button"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Novo Lead
        </Button>
      </div>

      {/* Error state */}
      {error && !isLoading && (
        <div
          className="flex items-center gap-2 rounded-md border border-danger/20 bg-danger/10 px-4 py-3"
          role="alert"
          data-testid="leads-list-error"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-danger" aria-hidden />
          <p className="text-sm text-danger">{error}</p>
          <Button variant="ghost" size="sm" onClick={fetchLeads} className="ml-auto">
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div
          className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          data-testid="leads-list-loading"
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && leads.length === 0 && (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="Nenhum lead registrado"
          description={
            channelFilter || funnelFilter
              ? 'Nenhum lead encontrado com estes filtros. Tente outros critérios.'
              : 'Adicione o primeiro lead para começar a rastrear conversões.'
          }
          ctaLabel={!channelFilter && !funnelFilter ? 'Registrar primeiro lead' : undefined}
          onCtaClick={
            !channelFilter && !funnelFilter
              ? () => router.push(`/${locale}/leads/new`)
              : undefined
          }
        />
      )}

      {/* Leads grid */}
      {!isLoading && !error && leads.length > 0 && (
        <>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onEdit={() => router.push(`/${locale}/leads/${lead.id}/edit`)}
                onDelete={() => setDeleteTarget(lead)}
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
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Excluir lead"
        description={`Tem certeza que deseja excluir o lead de "${deleteTarget?.company ?? 'Sem empresa'}"?`}
        isDestructive
        onConfirm={handleDelete}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        size="sm"
      >
        <div className="rounded-md border border-warning/20 bg-warning/10 p-3">
          <p className="text-sm text-warning-foreground">
            Conversões vinculadas a este lead também serão removidas. Esta ação não pode ser desfeita.
          </p>
        </div>
      </Modal>
    </div>
  )
}
