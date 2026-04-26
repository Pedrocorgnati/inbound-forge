'use client'

// TASK-11 ST002 (M11.4 / G-001) — Drawer de criacao de post acionado por
// clique em data vazia no calendario. Wrapper sobre Radix Dialog estilizado
// como side-sheet (entra pela direita) com foco automatico e ESC/overlay
// fecha. Reusa <PostForm> aceitando `defaultDate` para pre-preencher o
// agendamento.

import * as React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { PostForm } from '@/components/publishing/PostForm'

export interface PostFormDrawerProps {
  open: boolean
  defaultDate?: Date
  onClose: () => void
  /** Chamado apos sucesso de criacao do post — caller deve refazer fetch. */
  onCreated?: () => void
}

export function PostFormDrawer({
  open,
  defaultDate,
  onClose,
  onCreated,
}: PostFormDrawerProps) {
  const titleId = React.useId()
  const dateLabel = defaultDate
    ? format(defaultDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : null

  function handleSuccess() {
    onCreated?.()
    onClose()
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-40 bg-black/50',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
          )}
        />
        <Dialog.Content
          aria-labelledby={titleId}
          className={cn(
            'fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-background shadow-xl',
            'border-l border-border',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right',
            'duration-200',
            'sm:max-w-md',
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <Dialog.Title
                id={titleId}
                className="text-base font-semibold text-foreground"
              >
                Novo post
              </Dialog.Title>
              {dateLabel && (
                <Dialog.Description className="mt-0.5 text-xs text-muted-foreground">
                  Agendamento: {dateLabel}
                </Dialog.Description>
              )}
            </div>

            <Dialog.Close
              className={cn(
                'rounded-md p-1 text-muted-foreground transition-colors',
                'hover:bg-muted hover:text-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
              )}
              aria-label="Fechar drawer"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <PostForm defaultDate={defaultDate} onSuccess={handleSuccess} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
