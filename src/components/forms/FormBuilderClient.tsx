'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'
import { uuidv7 } from '@/lib/utils/uuidv7'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'

const KINDS = ['NEWSLETTER', 'GATED_DOWNLOAD', 'DEMO_REQUEST', 'GENERIC'] as const
const STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const

export function FormBuilderClient() {
  const t = useTranslations('forms')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({
    slug: '', name: '', kind: 'NEWSLETTER' as string, status: 'DRAFT' as string,
    headline: '', description: '', ctaLabel: '', successMessage: '', lgpdConsentText: '',
  })
  const set = (k: string, v: string) => setF((prev) => ({ ...prev, [k]: v }))

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
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
        toast.success(t('builder.saved'))
        setOpen(false)
        setF({ slug: '', name: '', kind: 'NEWSLETTER', status: 'DRAFT', headline: '', description: '', ctaLabel: '', successMessage: '', lgpdConsentText: '' })
        router.refresh()
      } else {
        toast.error(t('builder.error'))
        setSaving(false)
      }
    } catch {
      toast.error(t('builder.error'))
      setSaving(false)
    }
  }

  if (!open) {
    return <Button type="button" onClick={() => setOpen(true)}>{t('new')}</Button>
  }

  return (
    <form onSubmit={onSubmit} data-testid="form-builder" className="space-y-3 rounded-lg border p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input label={t('builder.slug')} required value={f.slug} onChange={(e) => set('slug', e.target.value)} placeholder="newsletter" helperText={t('builder.slugHint')} />
        <Input label={t('builder.name')} required value={f.name} onChange={(e) => set('name', e.target.value)} />
        <Select label={t('builder.kind')} value={f.kind} onChange={(e) => set('kind', e.target.value)} options={KINDS.map((k) => ({ value: k, label: t(`kind.${k}`) }))} />
        <Select label={t('builder.status')} value={f.status} onChange={(e) => set('status', e.target.value)} options={STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))} />
      </div>
      <Input label={t('builder.headline')} value={f.headline} onChange={(e) => set('headline', e.target.value)} />
      <Textarea label={t('builder.description')} rows={2} value={f.description} onChange={(e) => set('description', e.target.value)} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input label={t('builder.ctaLabel')} value={f.ctaLabel} onChange={(e) => set('ctaLabel', e.target.value)} />
        <Input label={t('builder.successMessage')} value={f.successMessage} onChange={(e) => set('successMessage', e.target.value)} />
      </div>
      <Input label={t('builder.consentText')} value={f.lgpdConsentText} onChange={(e) => set('lgpdConsentText', e.target.value)} />
      <div className="flex gap-2">
        <Button type="submit" isLoading={saving} loadingText={t('builder.saving')}>{t('builder.save')}</Button>
        <Button type="button" variant="ghost" size="icon" aria-label={t('builder.cancel')} onClick={() => setOpen(false)}>
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </form>
  )
}
