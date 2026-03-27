'use client'

import { Modal } from '@/components/ui/modal'

interface ObjectionDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  objectionContent: string
  isDeleting: boolean
}

export function ObjectionDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  objectionContent,
}: ObjectionDeleteModalProps) {
  const snippet =
    objectionContent.length > 60
      ? objectionContent.slice(0, 60).trimEnd() + '...'
      : objectionContent

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Deletar objeção"
      description={`Tem certeza que deseja deletar "${snippet}"?`}
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
