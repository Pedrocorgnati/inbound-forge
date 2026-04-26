'use client'

import { useTranslations } from 'next-intl'
import { Modal } from '@/components/ui/modal'

interface ConfirmReplaceKeyModalProps {
  open: boolean
  providerLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmReplaceKeyModal({
  open,
  providerLabel,
  onConfirm,
  onCancel,
}: ConfirmReplaceKeyModalProps) {
  const t = useTranslations('settings.api.confirmReplace')

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={t('title')}
      description={`${providerLabel} — ${t('body')}`}
      onConfirm={onConfirm}
      confirmLabel={t('confirm')}
      cancelLabel={t('cancel')}
      isDestructive
      size="sm"
    />
  )
}
