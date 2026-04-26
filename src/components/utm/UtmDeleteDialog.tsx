'use client'

// TASK-17 ST003 (CL-264): confirm destrutivo para UTM. Sem undo.

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

interface Props {
  postId: string
  label?: string
  children: React.ReactNode
}

export function UtmDeleteDialog({ postId, label, children }: Props) {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/utm-links/${postId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`Falha (${res.status})`)
      return res.json()
    },
    onSuccess: () => {
      setOpen(false)
      qc.invalidateQueries({ queryKey: ['utms'] })
      toast.success('UTM excluído')
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
            Excluir UTM?
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted-foreground">
            {label ? `"${label}" — ` : ''}Links usando este UTM deixarão de trackear corretamente.
            Esta ação é irreversível.
          </Dialog.Description>
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
              disabled={mutation.isPending}
              className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-60"
              data-testid="utm-delete-confirm"
            >
              {mutation.isPending ? 'Excluindo...' : 'Excluir'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
