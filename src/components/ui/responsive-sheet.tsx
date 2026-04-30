'use client'

import * as React from 'react'
import { Modal, type ModalProps } from './modal'
import { BottomSheet } from '@/components/mobile/BottomSheet'
import { useMediaQuery, MOBILE_QUERY } from '@/hooks/useMediaQuery'

/**
 * ResponsiveSheet — wrapper que renderiza BottomSheet em mobile (< 768px)
 * e Modal Radix em desktop. API espelha Modal para drop-in replacement.
 *
 * Uso (substitui Modal sem mudar contrato):
 *   <ResponsiveSheet open={open} onClose={onClose} title="Editar">
 *     {form}
 *   </ResponsiveSheet>
 *
 * TASK-REFORGE-5 (gap G-001 do MILESTONE-14).
 */
export function ResponsiveSheet(props: ModalProps) {
  const isMobile = useMediaQuery(MOBILE_QUERY)

  if (isMobile) {
    return (
      <BottomSheet open={props.open} onClose={props.onClose} title={props.title}>
        {props.description && (
          <p className="mb-4 text-sm text-muted-foreground">{props.description}</p>
        )}
        {props.children}
        {props.onConfirm && (
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <ConfirmActions {...props} />
          </div>
        )}
      </BottomSheet>
    )
  }

  return <Modal {...props} />
}

function ConfirmActions({
  onClose,
  onConfirm,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  isDestructive = false,
}: ModalProps) {
  const [isLoading, setIsLoading] = React.useState(false)

  async function handle() {
    if (!onConfirm) return
    setIsLoading(true)
    try {
      await onConfirm()
      onClose()
    } catch {
      // Caller handles
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onClose}
        disabled={isLoading}
        className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        onClick={handle}
        disabled={isLoading}
        className={
          'inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium ring-offset-background disabled:pointer-events-none disabled:opacity-50 ' +
          (isDestructive
            ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
            : 'bg-primary text-primary-foreground hover:bg-primary/90')
        }
      >
        {isLoading ? `${confirmLabel}...` : confirmLabel}
      </button>
    </>
  )
}
