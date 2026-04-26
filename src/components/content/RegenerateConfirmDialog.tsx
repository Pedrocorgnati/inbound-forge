'use client'

/**
 * TASK-6/ST002 (CL-190) — Dialog de confirmacao antes de regerar tema.
 */
import { useTranslations } from 'next-intl'
import { Modal } from '@/components/ui/modal'

interface Props {
  open: boolean
  count: number
  cap: number
  onClose: () => void
  onConfirm: () => Promise<void> | void
}

export function RegenerateConfirmDialog({ open, count, cap, onClose, onConfirm }: Props) {
  const t = useTranslations('regeneration')
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('confirmTitle')}
      description={t('confirmBody', { count })}
      confirmLabel={t('confirm')}
      onConfirm={onConfirm}
      size="md"
    >
      <p className="text-xs text-muted-foreground">
        {count} / {cap}
      </p>
    </Modal>
  )
}
