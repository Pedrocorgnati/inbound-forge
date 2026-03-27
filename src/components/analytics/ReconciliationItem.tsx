'use client'

// ReconciliationItem — card individual de item de reconciliação
// INT-106 | ANALYTICS_080 | COMP-001

import React, { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { CheckCircle, Trash2, AlertTriangle, ArrowUpRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface ReconciliationItemData {
  id: string
  type: 'click_without_conversion' | 'conversion_without_post'
  postId: string | null
  leadId: string | null
  weekOf: string
  resolved: boolean
  resolution: string | null
  createdAt: string
}

interface ReconciliationItemProps {
  item: ReconciliationItemData
  onResolved: (id: string) => void
  onDeleted: (id: string) => void
}

const TYPE_LABELS: Record<ReconciliationItemData['type'], string> = {
  click_without_conversion: 'Clique sem conversão',
  conversion_without_post: 'Conversão sem post',
}

const TYPE_DESCRIPTIONS: Record<ReconciliationItemData['type'], string> = {
  click_without_conversion: 'UTM Link com cliques registrados, mas sem lead associado ao post.',
  conversion_without_post: 'Lead captado sem UTM Link associado ao post de primeiro contato.',
}

export function ReconciliationItem({ item, onResolved, onDeleted }: ReconciliationItemProps) {
  const { locale } = useParams<{ locale: string }>()
  const [isResolving, setIsResolving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleResolve() {
    setIsResolving(true)
    try {
      const res = await fetch(`/api/v1/reconciliation/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: true }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Erro ao resolver item')
      }
      toast.success('Item marcado como resolvido')
      onResolved(item.id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao resolver item')
    } finally {
      setIsResolving(false)
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/v1/reconciliation/${item.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Erro ao excluir item')
      }
      toast.success('Item excluído')
      onDeleted(item.id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir item')
    } finally {
      setIsDeleting(false)
    }
  }

  const weekLabel = new Date(item.weekOf).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-md border p-3 text-sm transition-colors',
        item.resolved
          ? 'border-border bg-muted/30 opacity-70'
          : 'border-border bg-surface hover:bg-muted/20'
      )}
      data-testid="reconciliation-item"
      aria-label={`${TYPE_LABELS[item.type]} — semana de ${weekLabel}`}
    >
      {/* Ícone de tipo */}
      <div className="mt-0.5 shrink-0">
        {item.resolved ? (
          <CheckCircle className="h-4 w-4 text-green-500" aria-hidden="true" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
        )}
      </div>

      {/* Conteúdo */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{TYPE_LABELS[item.type]}</span>
          <span className="text-xs text-muted-foreground">Semana {weekLabel}</span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{TYPE_DESCRIPTIONS[item.type]}</p>

        {/* IDs de referência (sem PII — apenas IDs) */}
        <div className="mt-1.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {item.postId && (
            <Link
              href={`/${locale}/posts/${item.postId}`}
              className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 hover:bg-muted/80 hover:text-foreground transition-colors"
            >
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
              Post: {item.postId.slice(0, 8)}…
            </Link>
          )}
          {item.leadId && (
            <Link
              href={`/${locale}/leads/${item.leadId}`}
              className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 hover:bg-muted/80 hover:text-foreground transition-colors"
            >
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
              Lead: {item.leadId.slice(0, 8)}…
            </Link>
          )}
        </div>

        {/* Resolução */}
        {item.resolved && item.resolution && (
          <p className="mt-1.5 text-xs italic text-muted-foreground">
            Resolução: {item.resolution}
          </p>
        )}
      </div>

      {/* Ações (apenas para não resolvidos) */}
      {!item.resolved && (
        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950"
            onClick={handleResolve}
            disabled={isResolving || isDeleting}
            aria-label="Marcar como resolvido"
          >
            {isResolving ? (
              <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" aria-hidden="true" />
            ) : (
              <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
            onClick={handleDelete}
            disabled={isResolving || isDeleting}
            aria-label="Excluir item"
          >
            {isDeleting ? (
              <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" aria-hidden="true" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
