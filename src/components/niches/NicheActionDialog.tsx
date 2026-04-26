'use client'

// TASK-11 (CL-249): dialog que confirma approve/discard de NicheOpportunity.

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { toast } from 'sonner'

interface Opp {
  id: string
  sector: string
  painCategory: string
}

interface NicheActionDialogProps {
  kind: 'approve' | 'discard'
  opportunity: Opp
  onClose: () => void
  onDone: () => void
}

export function NicheActionDialog({ kind, opportunity, onClose, onDone }: NicheActionDialogProps) {
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    setSubmitting(true)
    try {
      const endpoint = kind === 'approve'
        ? `/api/v1/niche-opportunities/${opportunity.id}/approve`
        : `/api/v1/niche-opportunities/${opportunity.id}/discard`
      const body = kind === 'approve' ? { title: value } : { reason: value }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Falha (status ${res.status})`)
      }
      toast.success(kind === 'approve' ? 'Tema criado' : 'Oportunidade descartada')
      onDone()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro')
    } finally {
      setSubmitting(false)
    }
  }

  const min = kind === 'approve' ? 3 : 5
  const canSubmit = value.trim().length >= min && !submitting

  return (
    <Dialog.Root open onOpenChange={(o) => { if (!o) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-5 shadow-lg">
          <Dialog.Title className="text-lg font-semibold">
            {kind === 'approve' ? 'Aprovar oportunidade' : 'Descartar oportunidade'}
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            {opportunity.sector} — {opportunity.painCategory}
          </Dialog.Description>
          <label className="mt-4 flex flex-col gap-1 text-sm">
            <span>{kind === 'approve' ? 'Título do tema' : 'Motivo do descarte'}</span>
            {kind === 'approve' ? (
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-2"
                placeholder="Ex: Automação para cortar custo de atendimento B2B"
              />
            ) : (
              <textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                rows={3}
                className="rounded-md border border-border bg-background px-3 py-2"
                placeholder="Motivo (min 5 chars)"
              />
            )}
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-border px-3 py-1.5 text-sm">
              Cancelar
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={submit}
              className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-60"
            >
              Confirmar
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
