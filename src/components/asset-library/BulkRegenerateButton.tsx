'use client'

// BulkRegenerateButton — botao + progresso (TASK-13 ST003 / CL-229)
// TASK-1 ST004 (CL-275): substituido `window.confirm` por ConfirmDialog.

import { useState } from 'react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

interface Props {
  selectedIds: string[]
  onSuccess?: () => void
}

const MAX = 20

export function BulkRegenerateButton({ selectedIds, onSuccess }: Props) {
  const [busy, setBusy] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  function openConfirm() {
    if (selectedIds.length === 0) return
    if (selectedIds.length > MAX) {
      toast.error(`Maximo ${MAX} itens por lote`)
      return
    }
    setConfirmOpen(true)
  }

  async function trigger() {
    setBusy(true)
    try {
      const res = await apiClient('/api/v1/assets/bulk-regenerate', {
        method: 'POST',
        body: JSON.stringify({ assetIds: selectedIds }),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string }
        throw new Error(err.message ?? `HTTP ${res.status}`)
      }
      const data = (await res.json()) as { jobIds: string[]; correlationId: string }
      toast.success(`Enfileirado: ${data.jobIds.length} jobs`)
      onSuccess?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao enfileirar')
    } finally {
      setBusy(false)
      setConfirmOpen(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openConfirm}
        disabled={busy || selectedIds.length === 0}
        className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        data-testid="bulk-regenerate-button"
      >
        {busy ? 'Enfileirando…' : `Regerar selecionados (${selectedIds.length})`}
      </button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Regerar assets selecionados?"
        description={`Isto enfileira a regeracao de ${selectedIds.length} asset(s). A operacao consome creditos.`}
        confirmLabel="Regerar"
        variant="default"
        onConfirm={trigger}
      />
    </>
  )
}
