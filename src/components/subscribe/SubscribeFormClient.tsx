'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { uuidv7 } from '@/lib/utils/uuidv7'

type FormState = 'idle' | 'submitting' | 'success' | 'error'

export function SubscribeFormClient({ source }: { source?: string }) {
  const t = useTranslations('subscribe')
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [state, setState] = useState<FormState>('idle')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!consent || state === 'submitting') return
    setState('submitting')
    try {
      const res = await fetch('/api/v1/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': uuidv7() },
        body: JSON.stringify({ email, lgpdConsent: true, source: source ?? 'subscribe-page' }),
      })
      setState(res.ok ? 'success' : 'error')
    } catch {
      setState('error')
    }
  }

  if (state === 'success') {
    return (
      <div
        data-testid="subscribe-success"
        className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
      >
        {t('success')}
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} data-testid="subscribe-form" className="space-y-4">
      <div>
        <label htmlFor="sub-email" className="block text-sm font-medium text-foreground">
          {t('emailLabel')}
        </label>
        <input
          id="sub-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('emailPlaceholder')}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <label className="flex items-start gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          required
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5"
          data-testid="subscribe-consent"
        />
        <span>{t('consentLabel')}</span>
      </label>
      {state === 'error' && (
        <p data-testid="subscribe-error" className="text-sm text-red-600">
          {t('error')}
        </p>
      )}
      <button
        type="submit"
        disabled={!consent || state === 'submitting'}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {state === 'submitting' ? t('submitting') : t('submit')}
      </button>
    </form>
  )
}
