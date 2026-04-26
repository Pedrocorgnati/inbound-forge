'use client'

// TASK-17 ST001 (CL-242): confirm destrutivo para arquivamento de case.
// Usa Radix Dialog (projeto nao tem shadcn AlertDialog instalado).

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

interface Props {
  caseId: string
  caseTitle?: string
  children: React.ReactNode
}

export function CaseDeleteDialog({ caseId, caseTitle, children }: Props) {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()

  const unarchive = async () => {
    await fetch(`/api/v1/knowledge/cases/${caseId}/unarchive`, { method: 'POST' })
    qc.invalidateQueries({ queryKey: ['knowledge', 'cases'] })
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/knowledge/cases/${caseId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`Falha (${res.status})`)
      return res.json()
    },
    onSuccess: () => {
      setOpen(false)
      qc.invalidateQueries({ queryKey: ['knowledge', 'cases'] })
      toast.success('Case arquivado', {
        action: { label: 'Desfazer', onClick: () => void unarchive() },
        duration: 10_000,
      })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Erro ao arquivar'),
  })

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[90%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-lg">
          <Dialog.Title className="text-lg font-semibold text-destructive">
            Arquivar este caso?
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted-foreground">
            {caseTitle ? `"${caseTitle}" ` : ''}será removido da base usada nos prompts e não poderá mais
            ser referenciado pela IA. Você pode desfazer por 10 segundos.
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
              data-testid="case-delete-confirm"
            >
              {mutation.isPending ? 'Arquivando...' : 'Arquivar'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
