'use client'

// TASK-1 ST002 (CL-275) — ConfirmDialog canonico em `@/components/ui`.
// Alias com API declarativa (`open`/`onOpenChange`/`onConfirm`/`variant`)
// sobre `@/components/shared/ConfirmDialog` para uniformizar o uso em todo
// o app.
//
// Intake-Review TASK-14 ST001 (CL-TH-057/CL-CG-039): adicionada prop opcional
// `confirmationText` para forcar type-to-confirm em acoes destrutivas
// irreversiveis (delete hard de BD ou storage). Backward compatible —
// callers sem a prop mantem comportamento anterior.

import * as React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog as SharedConfirmDialog } from '@/components/shared/ConfirmDialog'

export type ConfirmDialogVariant = 'default' | 'destructive'

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: ConfirmDialogVariant
  onConfirm: () => void | Promise<void>
  /**
   * Se presente, renderiza input type-to-confirm: o botao Confirmar fica
   * desabilitado ate que o usuario digite a string exata. Usar em deletes
   * irreversiveis (BD / storage). Valor deve vir de i18n, ex:
   * `t('delete.confirm_keyword')`.
   */
  confirmationText?: string
  /** Texto de aviso destacado (ex.: "storage + thumbnail serao removidos"). */
  warning?: string
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'destructive',
  onConfirm,
  confirmationText,
  warning,
}: ConfirmDialogProps) {
  // Caminho legado: sem type-to-confirm usa o wrapper compartilhado.
  if (!confirmationText) {
    return (
      <SharedConfirmDialog
        open={open}
        onClose={() => onOpenChange(false)}
        onConfirm={onConfirm}
        title={title}
        message={description}
        confirmText={confirmLabel}
        cancelText={cancelLabel}
        variant={variant === 'destructive' ? 'danger' : 'warning'}
      />
    )
  }

  return (
    <TypeToConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      variant={variant}
      confirmationText={confirmationText}
      warning={warning}
      onConfirm={onConfirm}
    />
  )
}

function TypeToConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant,
  confirmationText,
  warning,
  onConfirm,
}: Required<
  Pick<
    ConfirmDialogProps,
    'open' | 'onOpenChange' | 'title' | 'description' | 'confirmLabel' | 'cancelLabel' | 'variant' | 'confirmationText' | 'onConfirm'
  >
> &
  Pick<ConfirmDialogProps, 'warning'>) {
  const [input, setInput] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (!open) setInput('')
  }, [open])

  const canConfirm = input === confirmationText && !loading

  const handleConfirm = async () => {
    if (!canConfirm) return
    setLoading(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch {
      // caller lida com erro
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-lg">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <Dialog.Title className="text-lg font-semibold leading-none tracking-tight text-destructive">
                {title}
              </Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">
                {description}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                className="rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          {warning && (
            <p
              role="alert"
              className="mt-3 rounded border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive"
            >
              {warning}
            </p>
          )}

          <div className="mt-4">
            <label className="block text-xs font-medium">
              Digite{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                {confirmationText}
              </code>{' '}
              para habilitar a exclusao:
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                autoComplete="off"
                autoFocus
                className="mt-2 w-full rounded border border-border bg-background px-2 py-1 text-sm"
                data-testid="confirm-dialog-type-input"
              />
            </label>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {cancelLabel}
            </Button>
            <Button
              variant={variant === 'destructive' ? 'destructive' : 'default'}
              onClick={() => void handleConfirm()}
              disabled={!canConfirm}
              isLoading={loading}
              loadingText={confirmLabel}
              data-testid="confirm-dialog-confirm"
            >
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
