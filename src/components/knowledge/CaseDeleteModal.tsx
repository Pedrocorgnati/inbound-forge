'use client'

import { Modal } from '@/components/ui/modal'

interface CaseDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  caseName: string
  isDeleting: boolean
}

export function CaseDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  caseName,
}: CaseDeleteModalProps) {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Deletar case"
      description={`Tem certeza que deseja deletar "${caseName}"?`}
      isDestructive
      onConfirm={onConfirm}
      confirmLabel="Deletar"
      cancelLabel="Cancelar"
      size="sm"
    >
      <div className="rounded-md border border-warning/20 bg-warning/10 p-3">
        <p className="text-sm text-warning-foreground">
          Dores vinculadas a este case perderão a associação. Esta ação não pode ser desfeita.
        </p>
      </div>
    </Modal>
  )
}
