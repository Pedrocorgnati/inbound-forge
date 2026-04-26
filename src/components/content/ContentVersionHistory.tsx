'use client'

// ContentVersionHistory — timeline + restore (TASK-12 ST002 / CL-076)
// TASK-1 ST004 (CL-275): substituido `window.confirm` por ConfirmDialog.

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

interface VersionRow {
  id: string
  createdAt: string
  createdBy: string | null
  changeSummary: string | null
}

interface Props {
  pieceId: string
  onRestore?: () => void
}

export function ContentVersionHistory({ pieceId, onRestore }: Props) {
  const [versions, setVersions] = useState<VersionRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [pendingRestoreId, setPendingRestoreId] = useState<string | null>(null)

  async function load() {
    setError(null)
    try {
      const res = await apiClient(`/api/v1/content/${pieceId}/versions`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { versions: VersionRow[] }
      setVersions(data.versions)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'erro')
    }
  }

  useEffect(() => {
    void load()
  }, [pieceId])

  async function performRestore(id: string) {
    setRestoringId(id)
    try {
      const res = await apiClient(`/api/v1/content/${pieceId}/versions/${id}/restore`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success('Versao restaurada')
      onRestore?.()
      void load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao restaurar')
    } finally {
      setRestoringId(null)
      setPendingRestoreId(null)
    }
  }

  function handleRestore(id: string) {
    setPendingRestoreId(id)
  }

  if (error) {
    return (
      <div role="alert" className="rounded border bg-red-50 p-3 text-sm text-red-800">
        Falha ao carregar: {error}{' '}
        <button className="underline" onClick={() => void load()}>
          Tentar novamente
        </button>
      </div>
    )
  }

  if (!versions) {
    return (
      <div className="space-y-2" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-muted" />
        ))}
      </div>
    )
  }

  if (versions.length === 0) {
    return (
      <div className="rounded border border-dashed p-6 text-center text-sm text-muted-foreground">
        Primeira edicao — nenhuma versao anterior.
      </div>
    )
  }

  return (
    <>
      <ul className="space-y-2" data-testid="content-version-history">
        {versions.map((v) => (
          <li
            key={v.id}
            className="flex items-center justify-between gap-4 rounded border border-border p-3 text-sm"
          >
            <div>
              <div className="font-medium">
                {new Date(v.createdAt).toLocaleString('pt-BR')}
              </div>
              <div className="text-xs text-muted-foreground">
                {v.changeSummary ?? 'Sem resumo'}{v.createdBy ? ` — por ${v.createdBy}` : ''}
              </div>
            </div>
            <button
              type="button"
              disabled={restoringId === v.id}
              onClick={() => handleRestore(v.id)}
              className="rounded border bg-background px-3 py-1 text-xs disabled:opacity-50"
            >
              {restoringId === v.id ? 'Restaurando…' : 'Restaurar'}
            </button>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={pendingRestoreId !== null}
        onOpenChange={(o) => !o && setPendingRestoreId(null)}
        title="Restaurar esta versao?"
        description="A versao atual sera substituida pela versao selecionada."
        confirmLabel="Restaurar"
        variant="default"
        onConfirm={() => { if (pendingRestoreId) performRestore(pendingRestoreId) }}
      />
    </>
  )
}
