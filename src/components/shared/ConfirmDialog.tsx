'use client'

/**
 * ConfirmDialog — Modal de confirmação para ações destrutivas ou de aviso
 * Rastreabilidade: CL-159, TASK-9 ST001
 *
 * Wrapper semântico sobre <Modal> que padroniza variantes danger/warning
 * em todo o app. Herda focus trap, ESC, animações e aria do Radix Dialog.
 */

import { Modal } from '@/components/ui/modal'

export interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  /** Mensagem de contexto exibida abaixo do título */
  message: string
  /** Rótulo do botão de confirmação */
  confirmText?: string
  /** Rótulo do botão de cancelamento */
  cancelText?: string
  /**
   * danger — botão destrutivo vermelho (delete, remove)
   * warning — botão de alerta amarelo (archive, disable)
   */
  variant?: 'danger' | 'warning'
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={message}
      onConfirm={onConfirm}
      confirmLabel={confirmText}
      cancelLabel={cancelText}
      isDestructive={variant === 'danger'}
      size="sm"
    />
  )
}
