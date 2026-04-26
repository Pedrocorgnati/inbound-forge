'use client'

// TASK-18 ST002 (CL-269): confirm destrutivo para delete de lead.
// TASK-3 ST004 (CL-TA-044): type-to-confirm "DELETAR" antes de habilitar botao (PII LGPD).
// Apos delete, redireciona para /leads.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

interface Props {
  leadId: string
  leadName?: string | null
  locale: string
  children: React.ReactNode
}

const CONFIRM_PHRASE = 'DELETAR'

export function LeadDeleteDialog({ leadId, leadName, locale, children }: Props) {
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const router = useRouter()

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/leads/${leadId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`Falha (${res.status})`)
      return res.json()
    },
    onSuccess: () => {
      setOpen(false)
      setConfirmText('')
      toast.success('Lead excluído')
      router.push(`/${locale}/leads`)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Erro'),
  })

  const canConfirm = confirmText === CONFIRM_PHRASE && !mutation.isPending

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) setConfirmText('')
      }}
    >
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[90%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-lg">
          <Dialog.Title className="text-lg font-semibold text-destructive">
            Excluir lead permanentemente?
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted-foreground">
            {leadName ? `"${leadName}" ` : 'Este lead '}será removido junto com todo
            histórico de conversões. Esta ação é <strong>irreversível</strong> e será
            registrada em audit log LGPD.
          </Dialog.Description>

          <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <label htmlFor="lead-delete-confirm-input" className="block text-sm font-medium">
              Digite <span className="font-mono text-destructive">{CONFIRM_PHRASE}</span> para
              confirmar:
            </label>
            <input
              id="lead-delete-confirm-input"
              type="text"
              autoComplete="off"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              data-testid="lead-delete-confirm-input"
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-destructive"
            />
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
              >
                Cancelar
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={() => mutation.mutate()}
              disabled={!canConfirm}
              className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-60 disabled:cursor-not-allowed"
              data-testid="lead-delete-confirm"
            >
              {mutation.isPending ? 'Excluindo...' : 'Excluir'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
