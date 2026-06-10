'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { uuidv7 } from '@/lib/utils/uuidv7'

export function BroadcastSendButton({ broadcastId }: { broadcastId: string }) {
  const t = useTranslations('broadcasts')
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function onSend() {
    if (busy) return
    if (!window.confirm(t('sendConfirm'))) return
    setBusy(true)
    try {
      const res = await fetch(`/api/v1/broadcasts/${broadcastId}/send`, {
        method: 'POST',
        headers: { 'Idempotency-Key': uuidv7() },
      })
      if (res.ok) router.refresh()
      else window.alert(t('sendError'))
    } catch {
      window.alert(t('sendError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={onSend}
      disabled={busy}
      className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
    >
      {busy ? t('sending') : t('send')}
    </button>
  )
}
