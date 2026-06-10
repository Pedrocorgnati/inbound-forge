'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { uuidv7 } from '@/lib/utils/uuidv7'

type State = 'idle' | 'saving' | 'error'

export function BroadcastComposerClient({ locale }: { locale: string }) {
  const t = useTranslations('broadcasts')
  const router = useRouter()
  const [subject, setSubject] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [fromName, setFromName] = useState('')
  const [state, setState] = useState<State>('idle')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (state === 'saving') return
    setState('saving')
    try {
      const res = await fetch('/api/v1/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': uuidv7() },
        body: JSON.stringify({ subject, bodyHtml, fromName: fromName || undefined }),
      })
      if (res.ok) {
        router.push(`/${locale}/broadcasts`)
        router.refresh()
      } else {
        setState('error')
      }
    } catch {
      setState('error')
    }
  }

  return (
    <form onSubmit={onSubmit} data-testid="broadcast-composer" className="max-w-2xl space-y-4">
      <div>
        <label htmlFor="bc-subject" className="block text-sm font-medium">{t('composer.subject')}</label>
        <input
          id="bc-subject"
          required
          minLength={3}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={t('composer.subjectPlaceholder')}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="bc-from" className="block text-sm font-medium">{t('composer.fromName')}</label>
        <input
          id="bc-from"
          value={fromName}
          onChange={(e) => setFromName(e.target.value)}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="bc-body" className="block text-sm font-medium">{t('composer.bodyHtml')}</label>
        <textarea
          id="bc-body"
          required
          minLength={10}
          rows={12}
          value={bodyHtml}
          onChange={(e) => setBodyHtml(e.target.value)}
          placeholder={t('composer.bodyPlaceholder')}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
        />
      </div>
      {state === 'error' && <p className="text-sm text-red-600">{t('composer.error')}</p>}
      <button
        type="submit"
        disabled={state === 'saving'}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {state === 'saving' ? t('composer.saving') : t('composer.save')}
      </button>
    </form>
  )
}
