'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { uuidv7 } from '@/lib/utils/uuidv7'

interface Props {
  slug: string
  kind: string
  ctaLabel?: string | null
  consentText?: string | null
  successMessage?: string | null
}

type State = 'idle' | 'submitting' | 'success' | 'error'

export function LeadFormRenderClient({ slug, kind, ctaLabel, consentText, successMessage }: Props) {
  const t = useTranslations('publicForm')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [consent, setConsent] = useState(false)
  const [state, setState] = useState<State>('idle')
  const collectName = kind === 'DEMO_REQUEST' || kind === 'GATED_DOWNLOAD'

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!consent || state === 'submitting') return
    setState('submitting')
    const sp = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
    try {
      const res = await fetch(`/api/f/${slug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': uuidv7() },
        body: JSON.stringify({
          email,
          name: collectName && name ? name : undefined,
          lgpdConsent: true,
          utm: {
            source: sp.get('utm_source') ?? undefined,
            medium: sp.get('utm_medium') ?? undefined,
            campaign: sp.get('utm_campaign') ?? undefined,
          },
        }),
      })
      setState(res.ok ? 'success' : 'error')
    } catch {
      setState('error')
    }
  }

  if (state === 'success') {
    return (
      <div data-testid="leadform-success" className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        {successMessage || t('success')}
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} data-testid="leadform" className="space-y-4">
      {collectName && (
        <div>
          <label htmlFor="lf-name" className="block text-sm font-medium text-foreground">{t('nameLabel')}</label>
          <input id="lf-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
      )}
      <div>
        <label htmlFor="lf-email" className="block text-sm font-medium text-foreground">{t('emailLabel')}</label>
        <input id="lf-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('emailPlaceholder')} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </div>
      <label className="flex items-start gap-2 text-sm text-muted-foreground">
        <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" data-testid="leadform-consent" />
        <span>{consentText || t('consentDefault')}</span>
      </label>
      {state === 'error' && <p data-testid="leadform-error" className="text-sm text-red-600">{t('error')}</p>}
      <button type="submit" disabled={!consent || state === 'submitting'} className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
        {state === 'submitting' ? t('submitting') : ctaLabel || t('submit')}
      </button>
    </form>
  )
}
