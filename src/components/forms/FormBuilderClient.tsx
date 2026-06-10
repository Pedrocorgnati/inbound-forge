'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { uuidv7 } from '@/lib/utils/uuidv7'

type State = 'idle' | 'saving' | 'error'
const KINDS = ['NEWSLETTER', 'GATED_DOWNLOAD', 'DEMO_REQUEST', 'GENERIC'] as const
const STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const

export function FormBuilderClient() {
  const t = useTranslations('forms')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<State>('idle')
  const [f, setF] = useState({
    slug: '', name: '', kind: 'NEWSLETTER' as string, status: 'DRAFT' as string,
    headline: '', description: '', ctaLabel: '', successMessage: '', lgpdConsentText: '',
  })
  const set = (k: string, v: string) => setF((prev) => ({ ...prev, [k]: v }))

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (state === 'saving') return
    setState('saving')
    try {
      const res = await fetch('/api/v1/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': uuidv7() },
        body: JSON.stringify({
          slug: f.slug, name: f.name, kind: f.kind, status: f.status,
          headline: f.headline || undefined, description: f.description || undefined,
          ctaLabel: f.ctaLabel || undefined, successMessage: f.successMessage || undefined,
          lgpdConsentText: f.lgpdConsentText || undefined,
        }),
      })
      if (res.ok) {
        setOpen(false)
        setF({ slug: '', name: '', kind: 'NEWSLETTER', status: 'DRAFT', headline: '', description: '', ctaLabel: '', successMessage: '', lgpdConsentText: '' })
        router.refresh()
      } else setState('error')
    } catch {
      setState('error')
    } finally {
      if (state !== 'error') setState('idle')
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
        {t('new')}
      </button>
    )
  }

  const input = 'mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
  return (
    <form onSubmit={onSubmit} data-testid="form-builder" className="space-y-3 rounded-lg border p-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium">{t('builder.slug')}</label>
          <input required value={f.slug} onChange={(e) => set('slug', e.target.value)} className={input} placeholder="newsletter" />
          <p className="mt-1 text-xs text-muted-foreground">{t('builder.slugHint')}</p>
        </div>
        <div>
          <label className="block text-sm font-medium">{t('builder.name')}</label>
          <input required value={f.name} onChange={(e) => set('name', e.target.value)} className={input} />
        </div>
        <div>
          <label className="block text-sm font-medium">{t('builder.kind')}</label>
          <select value={f.kind} onChange={(e) => set('kind', e.target.value)} className={input}>
            {KINDS.map((k) => <option key={k} value={k}>{t(`kind.${k}`)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">{t('builder.status')}</label>
          <select value={f.status} onChange={(e) => set('status', e.target.value)} className={input}>
            {STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium">{t('builder.headline')}</label>
        <input value={f.headline} onChange={(e) => set('headline', e.target.value)} className={input} />
      </div>
      <div>
        <label className="block text-sm font-medium">{t('builder.description')}</label>
        <textarea rows={2} value={f.description} onChange={(e) => set('description', e.target.value)} className={input} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium">{t('builder.ctaLabel')}</label>
          <input value={f.ctaLabel} onChange={(e) => set('ctaLabel', e.target.value)} className={input} />
        </div>
        <div>
          <label className="block text-sm font-medium">{t('builder.successMessage')}</label>
          <input value={f.successMessage} onChange={(e) => set('successMessage', e.target.value)} className={input} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium">{t('builder.consentText')}</label>
        <input value={f.lgpdConsentText} onChange={(e) => set('lgpdConsentText', e.target.value)} className={input} />
      </div>
      {state === 'error' && <p className="text-sm text-red-600">{t('builder.error')}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={state === 'saving'} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
          {state === 'saving' ? t('builder.saving') : t('builder.save')}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-md border px-4 py-2 text-sm">×</button>
      </div>
    </form>
  )
}
