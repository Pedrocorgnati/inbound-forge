'use client'

// AssetDeleteDialog — type-to-confirm para delete hard de VisualAsset
// Intake-Review TASK-14 ST003 (CL-CG-039).
// Diferente de AssetDeleteWithImpact (que lista impacto antes de deletar),
// este e um wrapper minimalista para quando a UI ja exibiu o impacto e
// quer apenas a salvaguarda de type-to-confirm.

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  assetId: string
  assetLabel?: string
  onDeleted?: () => void
}

export function AssetDeleteDialog({ open, onOpenChange, assetId, assetLabel, onDeleted }: Props) {
  const t = useTranslations('common.delete_dialog')
  const [error, setError] = useState<string | null>(null)

  const confirm = async () => {
    setError(null)
    const res = await fetch(`/api/v1/assets/${assetId}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      const msg = json?.error ?? `Falha (${res.status})`
      setError(msg)
      toast.error(msg)
      throw new Error(msg)
    }
    toast.success(t('success'))
    onDeleted?.()
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('asset_title')}
      description={
        assetLabel
          ? t('description_with_label', { label: assetLabel })
          : t('description_default')
      }
      confirmLabel={t('confirm_button')}
      cancelLabel={t('cancel')}
      variant="destructive"
      confirmationText={t('confirm_keyword')}
      warning={t('asset_warning') + (error ? ` — ${error}` : '')}
      onConfirm={confirm}
    />
  )
}
