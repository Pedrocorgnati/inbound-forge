'use client'

// TASK-17 ST002 (CL-263): form de edicao de UTM com validacao Zod.

import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

const UtmSchema = z.object({
  source: z.string().min(1, 'Obrigatório').max(80),
  medium: z.string().min(1, 'Obrigatório').max(80),
  campaign: z.string().min(1, 'Obrigatório').max(120),
  term: z.string().max(120).optional().or(z.literal('')),
  content: z.string().max(120).optional().or(z.literal('')),
})

type UtmForm = z.infer<typeof UtmSchema>

interface Props {
  utmId: string
  postId: string
  initial: Partial<UtmForm>
  children: React.ReactNode
}

export function UtmEditDialog({ utmId, postId, initial, children }: Props) {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<UtmForm>({
    resolver: zodResolver(UtmSchema),
    defaultValues: initial,
  })

  useEffect(() => {
    if (open) reset(initial)
  }, [open, initial, reset])

  const mutation = useMutation({
    mutationFn: async (data: UtmForm) => {
      const res = await fetch(`/api/v1/utm-links/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error(`Falha (${res.status})`)
      return res.json()
    },
    onSuccess: () => {
      setOpen(false)
      qc.invalidateQueries({ queryKey: ['utms'] })
      toast.success('UTM atualizado')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Erro'),
  })

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[90%] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-lg">
          <Dialog.Title className="text-lg font-semibold">Editar UTM</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            UTM {utmId.slice(0, 8)}…
          </Dialog.Description>
          <form
            onSubmit={handleSubmit((d) => mutation.mutate(d))}
            className="mt-4 space-y-3"
          >
            {(['source', 'medium', 'campaign', 'term', 'content'] as const).map((field) => (
              <div key={field}>
                <label className="block text-xs font-medium capitalize text-muted-foreground">
                  {field}
                </label>
                <input
                  type="text"
                  {...register(field)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {errors[field] && (
                  <p className="mt-1 text-xs text-destructive">{errors[field]?.message}</p>
                )}
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
                >
                  Cancelar
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                data-testid="utm-edit-save"
              >
                {mutation.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
