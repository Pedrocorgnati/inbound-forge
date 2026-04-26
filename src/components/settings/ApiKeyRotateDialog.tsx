'use client'

// TASK-19 ST002 (CL-290): UI para rotacionar API key com validacao upfront.

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'

interface Props {
  provider: 'openai' | 'ideogram' | 'flux' | 'browserless' | 'anthropic'
  label: string
  children: React.ReactNode
}

export function ApiKeyRotateDialog({ provider, label, children }: Props) {
  const [open, setOpen] = useState(false)
  const [show, setShow] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: async () => {
      setError(null)
      const res = await fetch(`/api/v1/settings/api-keys/${provider}/rotate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newKey }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg =
          (payload && (payload.error || payload.message)) ||
          `Falha (${res.status})`
        throw new Error(msg)
      }
      return payload
    },
    onSuccess: () => {
      setOpen(false)
      setNewKey('')
      setShow(false)
      qc.invalidateQueries({ queryKey: ['api-keys'] })
      toast.success(`Chave ${label} atualizada`)
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : 'Erro'
      setError(msg)
      toast.error(msg)
    },
  })

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) {
          setError(null)
          setNewKey('')
          setShow(false)
        }
      }}
    >
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[90%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-lg">
          <Dialog.Title className="text-lg font-semibold">
            Rotacionar chave — {label}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted-foreground">
            A nova chave será validada junto ao provider antes de ser persistida. A
            chave antiga só é substituída se a nova passar no teste.
          </Dialog.Description>

          <div className="mt-4 space-y-2">
            <label className="block text-xs font-medium text-muted-foreground" htmlFor="newKey">
              Nova API key
            </label>
            <div className="relative">
              <input
                id="newKey"
                name="newKey"
                type={show ? 'text' : 'password'}
                autoComplete="off"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 pr-10 text-sm font-mono"
                data-testid={`rotate-input-${provider}`}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-label={show ? 'Ocultar' : 'Mostrar'}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
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
              disabled={mutation.isPending || newKey.length < 10}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              data-testid={`rotate-confirm-${provider}`}
            >
              {mutation.isPending ? 'Validando...' : 'Rotacionar'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
