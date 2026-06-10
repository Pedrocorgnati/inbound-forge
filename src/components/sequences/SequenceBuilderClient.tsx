'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { uuidv7 } from '@/lib/utils/uuidv7'

type Step = { delayHours: number; subject: string; bodyHtml: string }
type State = 'idle' | 'saving' | 'error'

export function SequenceBuilderClient() {
  const t = useTranslations('sequences')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<State>('idle')
  const [name, setName] = useState('')
  const [status, setStatus] = useState('DRAFT')
  const [autoEnroll, setAutoEnroll] = useState(true)
  const [steps, setSteps] = useState<Step[]>([{ delayHours: 0, subject: '', bodyHtml: '' }])

  const setStep = (i: number, patch: Partial<Step>) => setSteps((s) => s.map((st, idx) => (idx === i ? { ...st, ...patch } : st)))
  const addStep = () => setSteps((s) => [...s, { delayHours: 24, subject: '', bodyHtml: '' }])
  const removeStep = (i: number) => setSteps((s) => (s.length > 1 ? s.filter((_, idx) => idx !== i) : s))

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (state === 'saving') return
    setState('saving')
    try {
      const res = await fetch('/api/v1/sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': uuidv7() },
        body: JSON.stringify({ name, status, autoEnroll, steps }),
      })
      if (res.ok) {
        setOpen(false)
        setName(''); setStatus('DRAFT'); setAutoEnroll(true); setSteps([{ delayHours: 0, subject: '', bodyHtml: '' }])
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
    <form onSubmit={onSubmit} data-testid="sequence-builder" className="space-y-4 rounded-lg border p-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium">{t('builder.name')}</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} className={input} />
        </div>
        <div>
          <label className="block text-sm font-medium">{t('builder.status')}</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={input}>
            {['DRAFT', 'ACTIVE', 'ARCHIVED'].map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={autoEnroll} onChange={(e) => setAutoEnroll(e.target.checked)} />
        {t('builder.autoEnroll')}
      </label>

      <div className="space-y-3">
        {steps.map((st, i) => (
          <div key={i} className="rounded-md border bg-muted/30 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">{t('builder.step')} {i + 1}</span>
              {steps.length > 1 && (
                <button type="button" onClick={() => removeStep(i)} className="text-xs text-red-600">{t('builder.removeStep')}</button>
              )}
            </div>
            <div className="grid grid-cols-[120px_1fr] gap-2">
              <div>
                <label className="block text-xs">{t('builder.delayHours')}</label>
                <input type="number" min={0} value={st.delayHours} onChange={(e) => setStep(i, { delayHours: Number(e.target.value) })} className={input} />
              </div>
              <div>
                <label className="block text-xs">{t('builder.subject')}</label>
                <input required value={st.subject} onChange={(e) => setStep(i, { subject: e.target.value })} className={input} />
              </div>
            </div>
            <div className="mt-2">
              <label className="block text-xs">{t('builder.body')}</label>
              <textarea required rows={4} value={st.bodyHtml} onChange={(e) => setStep(i, { bodyHtml: e.target.value })} className={`${input} font-mono`} />
            </div>
          </div>
        ))}
        <button type="button" onClick={addStep} className="rounded-md border px-3 py-1 text-sm">+ {t('builder.addStep')}</button>
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
