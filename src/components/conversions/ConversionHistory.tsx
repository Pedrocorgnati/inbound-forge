'use client'

import { useCallback, useEffect, useState } from 'react'
import { Trash2, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/shared/empty-state'
import { toast } from '@/components/ui/toast'
import { ConversionBadge } from './ConversionBadge'
import type { ConversionType } from '@/types/enums'

interface ConversionItem {
  id: string
  leadId: string
  type: ConversionType
  attribution: string
  occurredAt: string
  notes: string | null
  createdAt: string
  lead?: { id: string; company: string | null; firstTouchThemeId: string }
}

interface ConversionHistoryProps {
  leadId: string
  themeId: string
  refreshKey?: number
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function ConversionHistory({ leadId, _themeId, refreshKey }: ConversionHistoryProps) {
  const [items, setItems] = useState<ConversionItem[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<ConversionItem | null>(null)

  const fetchConversions = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/v1/conversions?leadId=${leadId}&limit=100`)
      if (!res.ok) throw new Error('Falha ao carregar conversoes')
      const json = await res.json()
      setItems(json.data ?? [])
      setTotal(json.meta?.total ?? json.data?.length ?? 0)
    } catch {
      toast.error('Erro ao carregar conversoes')
    } finally {
      setIsLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    fetchConversions()
  }, [fetchConversions, refreshKey])

  async function handleDelete() {
    if (!deleteTarget) return

    try {
      const res = await fetch(`/api/v1/conversions/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Falha ao deletar conversao')

      toast.success('Conversao removida')
      setDeleteTarget(null)
      fetchConversions()
    } catch {
      toast.error('Erro ao deletar conversao')
      throw new Error('delete failed') // re-throw so Modal stays open
    }
  }

  if (isLoading) {
    return (
      <div data-testid="conversion-history-loading" className="space-y-3">
        <Skeleton variant="text" className="h-6 w-40" />
        <Skeleton variant="rectangle" className="h-16 w-full" />
        <Skeleton variant="rectangle" className="h-16 w-full" />
        <Skeleton variant="rectangle" className="h-16 w-full" />
      </div>
    )
  }

  return (
    <div data-testid="conversion-history" className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">
        Conversoes ({total})
      </h3>

      {items.length === 0 ? (
        <EmptyState
          icon={<History className="h-12 w-12" />}
          title="Nenhuma conversao"
          description="Nenhuma conversao registrada para este lead."
        />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
              data-testid={`conversion-item-${item.id}`}
            >
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <ConversionBadge type={item.type} />
                  <span className="text-xs text-muted-foreground">
                    {dateFormatter.format(new Date(item.occurredAt))}
                  </span>
                </div>
                {item.notes && (
                  <p className="text-sm text-muted-foreground truncate">
                    {item.notes}
                  </p>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteTarget(item)}
                className="shrink-0 text-danger hover:text-danger hover:bg-danger/10"
                aria-label="Deletar conversao"
                data-testid={`conversion-delete-${item.id}`}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {/* Delete confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Deletar conversao"
        description="Tem certeza que deseja deletar esta conversao?"
        isDestructive
        onConfirm={handleDelete}
        confirmLabel="Deletar"
        cancelLabel="Cancelar"
        size="sm"
      >
        <div className="rounded-md border border-warning/20 bg-warning/10 p-3">
          <p className="text-sm text-warning-foreground">
            O score de conversao do tema sera recalculado. Esta acao nao pode ser desfeita.
          </p>
        </div>
      </Modal>
    </div>
  )
}
