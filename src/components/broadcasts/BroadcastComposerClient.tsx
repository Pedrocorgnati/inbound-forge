'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { uuidv7 } from '@/lib/utils/uuidv7'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'

export function BroadcastComposerClient({ locale }: { locale: string }) {
  const t = useTranslations('broadcasts')
  const router = useRouter()
  const [subject, setSubject] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [fromName, setFromName] = useState('')
  const [saving, setSaving] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/v1/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': uuidv7() },
        body: JSON.stringify({ subject, bodyHtml, fromName: fromName || undefined }),
      })
      if (res.ok) {
        toast.success(t('composer.saved'))
        router.push(`/${locale}/broadcasts`)
        router.refresh()
      } else {
        toast.error(t('composer.error'))
        setSaving(false)
      }
    } catch {
      toast.error(t('composer.error'))
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} data-testid="broadcast-composer" className="max-w-2xl space-y-4" noValidate>
      <Input
        id="bc-subject"
        required
        minLength={3}
        label={t('composer.subject')}
        placeholder={t('composer.subjectPlaceholder')}
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
      />
      <Input id="bc-from" label={t('composer.fromName')} value={fromName} onChange={(e) => setFromName(e.target.value)} />
      <Textarea
        id="bc-body"
        required
        minLength={10}
        rows={12}
        label={t('composer.bodyHtml')}
        placeholder={t('composer.bodyPlaceholder')}
        value={bodyHtml}
        onChange={(e) => setBodyHtml(e.target.value)}
        className="font-mono"
      />
      <Button type="submit" isLoading={saving} loadingText={t('composer.saving')}>
        {t('composer.save')}
      </Button>
    </form>
  )
}
