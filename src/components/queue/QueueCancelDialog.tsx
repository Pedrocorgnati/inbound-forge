'use client'

// TASK-20 ST003 (CL-261): confirm destrutivo para cancelar item da fila.
// Dispara DELETE na rota da fila e oferece undo via toast por 5s.

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

interface Props {
  itemId: string
  itemLabel?: string
  endpoint?: string
  children: React.ReactNode
}

export function QueueCancelDialog({ itemId, itemLabel, endpoint, children }: Props) {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const base = endpoint ?? `/api/v1/queue/${itemId}`

  const reschedule = async () => {
    await fetch(`${base}/reschedule`, { method: 'POST' })
    qc.invalidateQueries({ queryKey: ['queue'] })
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(base, { method: 'DELETE' })
      if (!res.ok) throw new Error(`Falha (${res.status})`)
      return res.json().catch(() => ({}))
    },
    onSuccess: () => {
      setOpen(false)
      qc.invalidateQueries({ queryKey: ['queue'] })
      toast.success('Publicação cancelada', {
        action: { label: 'Desfazer', onClick: () => void reschedule() },
        duration: 5_000,
      })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Erro'),
  })

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[90%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-lg">
          <Dialog.Title className="text-lg font-semibold text-destructive">
            Cancelar publicação?
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted-foreground">
            {itemLabel ? `"${itemLabel}" ` : 'Este item '}será removido da fila
            permanentemente e não será publicado. Você pode desfazer por 5 segundos.
          </Dialog.Description>
          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
              >
                Voltar
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-60"
              data-testid="queue-cancel-confirm"
            >
              {mutation.isPending ? 'Cancelando...' : 'Cancelar publicação'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
