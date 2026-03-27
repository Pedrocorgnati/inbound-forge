'use client'

import { Modal } from '@/components/ui/modal'

interface PatternDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  patternName: string
  isDeleting: boolean
}

export function PatternDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  patternName,
}: PatternDeleteModalProps) {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Deletar padrão"
      description={`Tem certeza que deseja deletar "${patternName}"?`}
      isDestructive
      onConfirm={onConfirm}
      confirmLabel="Deletar"
      cancelLabel="Cancelar"
      size="sm"
    >
      <div className="rounded-md border border-warning/20 bg-warning/10 p-3">
        <p className="text-sm text-warning-foreground">
          Esta ação não pode ser desfeita.
        </p>
      </div>
    </Modal>
  )
}
