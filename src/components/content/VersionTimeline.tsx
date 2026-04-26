'use client'

// TASK-12 ST001 (CL-254): timeline vertical de versoes com seletor para diff.
// TASK-1 ST004 (CL-275): substituido `window.confirm` por ConfirmDialog.

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { VersionDiff } from './VersionDiff'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

interface Variant {
  id: string
  angle: string
  text: string
  editedBody?: string | null
  generationVersion: number
  isSelected: boolean
  createdAt: string
}

interface HistoryResp {
  success: boolean
  data: { pieceId: string; variants: Variant[] }
}

interface VersionTimelineProps {
  pieceId: string
}

function bodyOf(v: Variant) {
  return v.editedBody ?? v.text ?? ''
}

export function VersionTimeline({ pieceId }: VersionTimelineProps) {
  const qc = useQueryClient()
  const [selected, setSelected] = useState<[string | null, string | null]>([null, null])
  const [restoring, setRestoring] = useState(false)
  const [pendingRestoreId, setPendingRestoreId] = useState<string | null>(null)

  const { data, isLoading } = useQuery<HistoryResp>({
    queryKey: ['content-history', pieceId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/content/${pieceId}/history`)
      if (!res.ok) throw new Error(`Falha (${res.status})`)
      return res.json()
    },
  })

  const variants = data?.data.variants ?? []
  const left = variants.find((v) => v.id === selected[0]) ?? null
  const right = variants.find((v) => v.id === selected[1]) ?? null

  function toggle(id: string) {
    setSelected(([a, b]) => {
      if (a === id) return [b, null]
      if (b === id) return [a, null]
      if (!a) return [id, b]
      if (!b) return [a, id]
      return [id, a]
    })
  }

  async function performRestore(variantId: string) {
    setRestoring(true)
    try {
      const res = await fetch(`/api/v1/content/${pieceId}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId }),
      })
      if (!res.ok) throw new Error(`Falha (${res.status})`)
      toast.success('Versão restaurada')
      qc.invalidateQueries({ queryKey: ['content-history', pieceId] })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro')
    } finally {
      setRestoring(false)
      setPendingRestoreId(null)
    }
  }

  function restore(variantId: string) {
    setPendingRestoreId(variantId)
  }

  if (isLoading) return <div className="h-40 animate-pulse rounded-md bg-muted/40" />

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]" data-testid="version-timeline">
      <ol className="relative space-y-3 border-l border-border pl-4">
        {variants.map((v) => {
          const isA = selected[0] === v.id
          const isB = selected[1] === v.id
          return (
            <li key={v.id} className="relative">
              <span className="absolute -left-[21px] top-2 h-2.5 w-2.5 rounded-full bg-primary" />
              <button
                type="button"
                onClick={() => toggle(v.id)}
                className={
                  'w-full rounded-md border border-border bg-card p-2 text-left text-sm hover:bg-muted ' +
                  (isA || isB ? 'ring-2 ring-primary' : '')
                }
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">v{v.generationVersion} — {v.angle}</span>
                  {v.isSelected && <span className="text-xs text-emerald-600">atual</span>}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(v.createdAt).toLocaleString()}
                </div>
              </button>
              {!v.isSelected && (
                <button
                  type="button"
                  onClick={() => restore(v.id)}
                  disabled={restoring}
                  className="mt-1 text-xs text-primary underline"
                >
                  Restaurar esta versão
                </button>
              )}
            </li>
          )
        })}
        {variants.length === 0 && (
          <li className="text-sm text-muted-foreground">Nenhuma versão.</li>
        )}
      </ol>
      <div>
        {left && right ? (
          <VersionDiff before={bodyOf(left)} after={bodyOf(right)} />
        ) : (
          <p className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
            Selecione duas versões na timeline para comparar.
          </p>
        )}
      </div>
      <ConfirmDialog
        open={pendingRestoreId !== null}
        onOpenChange={(o) => !o && setPendingRestoreId(null)}
        title="Restaurar esta versão?"
        description="A versão atual será arquivada e substituída pela selecionada."
        confirmLabel="Restaurar"
        variant="default"
        onConfirm={() => { if (pendingRestoreId) performRestore(pendingRestoreId) }}
      />
    </div>
  )
}
