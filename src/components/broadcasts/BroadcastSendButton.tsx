'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { uuidv7 } from '@/lib/utils/uuidv7'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { toast } from '@/components/ui/toast'

export function BroadcastSendButton({ broadcastId }: { broadcastId: string }) {
  const t = useTranslations('broadcasts')
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function onConfirm() {
    try {
      const res = await fetch(`/api/v1/broadcasts/${broadcastId}/send`, {
        method: 'POST',
        headers: { 'Idempotency-Key': uuidv7() },
      })
      if (res.ok) {
        toast.success(t('sendSuccess'))
        router.refresh()
      } else {
        toast.error(t('sendError'))
      }
    } catch {
      toast.error(t('sendError'))
    } finally {
      setOpen(false)
    }
  }

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        {t('send')}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t('send')}
        description={t('sendConfirm')}
        confirmLabel={t('send')}
        onConfirm={onConfirm}
      />
    </>
  )
}
