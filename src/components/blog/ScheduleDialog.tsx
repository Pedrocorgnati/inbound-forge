'use client'

// TASK-6 ST003 (CL-286): dialog minimalista para agendar/cancelar publicacao
// de um BlogArticle. Usa input datetime-local nativo (evita dependencia nova).

import { useState } from 'react'
import { toast } from 'sonner'
import * as Dialog from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'

interface ScheduleDialogProps {
  articleId: string
  scheduledFor?: string | null
  onUpdated?: () => void
  trigger?: React.ReactNode
}

function toLocalInputValue(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function ScheduleDialog({ articleId, scheduledFor, onUpdated, trigger }: ScheduleDialogProps) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(toLocalInputValue(scheduledFor))
  const [submitting, setSubmitting] = useState(false)

  async function call(payload: { scheduledFor: string | null }) {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/v1/blog/articles/${articleId}/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Falha (status ${res.status})`)
      }
      toast.success(payload.scheduledFor ? 'Artigo agendado' : 'Agendamento cancelado')
      setOpen(false)
      onUpdated?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao agendar')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSchedule = () => {
    if (!value) {
      toast.error('Escolha uma data futura')
      return
    }
    const iso = new Date(value).toISOString()
    if (new Date(iso).getTime() <= Date.now()) {
      toast.error('A data deve ser no futuro')
      return
    }
    void call({ scheduledFor: iso })
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {trigger ?? (
          <button
            type="button"
            className="rounded-md border border-border bg-card px-3 py-1.5 text-sm hover:bg-muted"
          >
            {scheduledFor ? 'Editar agendamento' : 'Agendar'}
          </button>
        )}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2',
            'rounded-lg border border-border bg-background p-5 shadow-lg'
          )}
          data-testid="schedule-dialog"
        >
          <Dialog.Title className="text-lg font-semibold">Agendar publicação</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            Escolha data e hora. O artigo será publicado automaticamente.
          </Dialog.Description>
          <div className="mt-4 space-y-3">
            <label className="flex flex-col gap-1 text-sm">
              <span>Data e hora</span>
              <input
                type="datetime-local"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-2"
                data-testid="schedule-input"
              />
            </label>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
            {scheduledFor && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => void call({ scheduledFor: null })}
                className="rounded-md border border-border px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10"
              >
                Cancelar agendamento
              </button>
            )}
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-md border border-border px-3 py-1.5 text-sm"
              >
                Fechar
              </button>
            </Dialog.Close>
            <button
              type="button"
              disabled={submitting || !value}
              onClick={handleSchedule}
              className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-60"
            >
              {submitting ? 'Salvando...' : 'Confirmar'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
