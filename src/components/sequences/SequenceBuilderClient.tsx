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
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/components/ui/toast'

type Step = { delayHours: number; subject: string; bodyHtml: string }
const STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const

export function SequenceBuilderClient() {
  const t = useTranslations('sequences')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [status, setStatus] = useState('DRAFT')
  const [autoEnroll, setAutoEnroll] = useState(true)
  const [steps, setSteps] = useState<Step[]>([{ delayHours: 0, subject: '', bodyHtml: '' }])

  const setStep = (i: number, patch: Partial<Step>) => setSteps((s) => s.map((st, idx) => (idx === i ? { ...st, ...patch } : st)))
  const addStep = () => setSteps((s) => [...s, { delayHours: 24, subject: '', bodyHtml: '' }])
  const removeStep = (i: number) => setSteps((s) => (s.length > 1 ? s.filter((_, idx) => idx !== i) : s))

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/v1/sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': uuidv7() },
        body: JSON.stringify({ name, status, autoEnroll, steps }),
      })
      if (res.ok) {
        toast.success(t('builder.saved'))
        setOpen(false)
        setName(''); setStatus('DRAFT'); setAutoEnroll(true); setSteps([{ delayHours: 0, subject: '', bodyHtml: '' }])
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
    <form onSubmit={onSubmit} data-testid="sequence-builder" className="space-y-4 rounded-lg border p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input label={t('builder.name')} required value={name} onChange={(e) => setName(e.target.value)} />
        <Select label={t('builder.status')} value={status} onChange={(e) => setStatus(e.target.value)} options={STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))} />
      </div>
      <Checkbox label={t('builder.autoEnroll')} checked={autoEnroll} onCheckedChange={(v) => setAutoEnroll(v === true)} />

      <div className="space-y-3">
        {steps.map((st, i) => (
          <div key={i} className="rounded-md border bg-muted/30 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">{t('builder.step')} {i + 1}</span>
              {steps.length > 1 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => removeStep(i)} className="text-danger">
                  {t('builder.removeStep')}
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[140px_1fr]">
              <Input type="number" min={0} label={t('builder.delayHours')} value={String(st.delayHours)} onChange={(e) => setStep(i, { delayHours: Number(e.target.value) })} />
              <Input label={t('builder.subject')} required value={st.subject} onChange={(e) => setStep(i, { subject: e.target.value })} />
            </div>
            <div className="mt-2">
              <Textarea label={t('builder.body')} required rows={4} value={st.bodyHtml} onChange={(e) => setStep(i, { bodyHtml: e.target.value })} className="font-mono" />
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addStep}>+ {t('builder.addStep')}</Button>
      </div>

      <div className="flex gap-2">
        <Button type="submit" isLoading={saving} loadingText={t('builder.saving')}>{t('builder.save')}</Button>
        <Button type="button" variant="ghost" size="icon" aria-label={t('builder.cancel')} onClick={() => setOpen(false)}>
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </form>
  )
}
