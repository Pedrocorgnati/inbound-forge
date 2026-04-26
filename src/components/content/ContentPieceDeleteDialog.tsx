'use client'

// ContentPieceDeleteDialog — type-to-confirm para soft-delete (archive) de ContentPiece
// Intake-Review TASK-23 ST001 (CL-CS-035). Usa keyword ARQUIVAR (nao DELETAR) — soft-delete.

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  pieceId: string
  pieceTitle?: string
  onArchived?: () => void
}

export function ContentPieceDeleteDialog({
  open,
  onOpenChange,
  pieceId,
  pieceTitle,
  onArchived,
}: Props) {
  const t = useTranslations('common.delete_dialog')
  const [error, setError] = useState<string | null>(null)

  const confirm = async () => {
    setError(null)
    const res = await fetch(`/api/v1/content/${pieceId}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      const msg = json?.error ?? `Falha (${res.status})`
      setError(msg)
      toast.error(msg)
      throw new Error(msg)
    }
    toast.success(t('success'))
    onArchived?.()
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('content_piece_title')}
      description={
        pieceTitle
          ? t('description_with_label', { label: pieceTitle })
          : t('description_default')
      }
      confirmLabel={t('archive_button')}
      cancelLabel={t('cancel')}
      variant="destructive"
      confirmationText={t('archive_keyword')}
      warning={t('content_piece_warning') + (error ? ` — ${error}` : '')}
      onConfirm={confirm}
    />
  )
}
