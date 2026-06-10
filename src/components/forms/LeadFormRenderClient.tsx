'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { uuidv7 } from '@/lib/utils/uuidv7'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'

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
      <div
        role="status"
        data-testid="leadform-success"
        className="rounded-md border border-success-bg bg-success-bg p-4 text-sm text-success-text"
      >
        {successMessage || t('success')}
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} data-testid="leadform" className="space-y-4" noValidate>
      {collectName && (
        <Input id="lf-name" label={t('nameLabel')} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
      )}
      <Input
        id="lf-email"
        type="email"
        required
        autoComplete="email"
        label={t('emailLabel')}
        placeholder={t('emailPlaceholder')}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Checkbox
        label={consentText || t('consentDefault')}
        checked={consent}
        onCheckedChange={(v) => setConsent(v === true)}
        data-testid="leadform-consent"
      />
      {state === 'error' && (
        <p role="alert" data-testid="leadform-error" className="text-sm text-danger">
          {t('error')}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={!consent} isLoading={state === 'submitting'} loadingText={t('submitting')}>
        {ctaLabel || t('submit')}
      </Button>
    </form>
  )
}
