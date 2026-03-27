'use client'

import { Modal } from '@/components/ui/modal'

interface PainDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  painTitle: string
  isDeleting: boolean
}

export function PainDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  painTitle,
}: PainDeleteModalProps) {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Deletar dor"
      description={`Tem certeza que deseja deletar "${painTitle}"?`}
      isDestructive
      onConfirm={onConfirm}
      confirmLabel="Deletar"
      cancelLabel="Cancelar"
      size="sm"
    >
      <div className="rounded-md border border-warning/20 bg-warning/10 p-3">
        <p className="text-sm text-warning-foreground">
          Cases vinculados a esta dor perderão a associação. Padrões associados também serão afetados. Esta ação não pode ser desfeita.
        </p>
      </div>
    </Modal>
  )
}
