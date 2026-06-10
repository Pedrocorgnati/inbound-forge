'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { uuidv7 } from '@/lib/utils/uuidv7'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'

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
        role="status"
        data-testid="subscribe-success"
        className="rounded-md border border-success-bg bg-success-bg p-4 text-sm text-success-text"
      >
        {t('success')}
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} data-testid="subscribe-form" className="space-y-4" noValidate>
      <Input
        id="sub-email"
        type="email"
        required
        autoComplete="email"
        label={t('emailLabel')}
        placeholder={t('emailPlaceholder')}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Checkbox
        label={t('consentLabel')}
        checked={consent}
        onCheckedChange={(v) => setConsent(v === true)}
        data-testid="subscribe-consent"
      />
      {state === 'error' && (
        <p role="alert" data-testid="subscribe-error" className="text-sm text-danger">
          {t('error')}
        </p>
      )}
      <Button
        type="submit"
        className="w-full"
        disabled={!consent}
        isLoading={state === 'submitting'}
        loadingText={t('submitting')}
      >
        {t('submit')}
      </Button>
    </form>
  )
}
