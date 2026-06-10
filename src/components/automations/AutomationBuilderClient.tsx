'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { uuidv7 } from '@/lib/utils/uuidv7'

const TRIGGERS = ['LEAD_CREATED', 'LEAD_STATUS_CHANGED', 'LEAD_MQL'] as const
const ACTIONS = ['NOTIFY', 'SET_FUNNEL_STAGE', 'ENROLL_SEQUENCE'] as const
const STAGES = ['AWARENESS', 'CONSIDERATION', 'DECISION'] as const
type State = 'idle' | 'saving' | 'error'

export function AutomationBuilderClient() {
  const t = useTranslations('automations')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<State>('idle')
  const [name, setName] = useState('')
  const [trigger, setTrigger] = useState<string>('LEAD_CREATED')
  const [actionType, setActionType] = useState<string>('NOTIFY')
  const [enabled, setEnabled] = useState(true)
  const [funnelStage, setFunnelStage] = useState('AWARENESS')
  const [sequenceId, setSequenceId] = useState('')
  const [note, setNote] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (state === 'saving') return
    setState('saving')
    const actionConfig: Record<string, string> = {}
    if (actionType === 'SET_FUNNEL_STAGE') actionConfig.funnelStage = funnelStage
    if (actionType === 'ENROLL_SEQUENCE') actionConfig.sequenceId = sequenceId
    if (actionType === 'NOTIFY' && note) actionConfig.note = note
    try {
      const res = await fetch('/api/v1/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': uuidv7() },
        body: JSON.stringify({ name, trigger, actionType, enabled, actionConfig }),
      })
      if (res.ok) {
        setOpen(false)
        setName(''); setNote(''); setSequenceId('')
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
    <form onSubmit={onSubmit} data-testid="automation-builder" className="space-y-3 rounded-lg border p-4">
      <div>
        <label className="block text-sm font-medium">{t('builder.name')}</label>
        <input required value={name} onChange={(e) => setName(e.target.value)} className={input} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium">{t('builder.trigger')}</label>
          <select value={trigger} onChange={(e) => setTrigger(e.target.value)} className={input}>
            {TRIGGERS.map((tr) => <option key={tr} value={tr}>{t(`trigger.${tr}`)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">{t('builder.action')}</label>
          <select value={actionType} onChange={(e) => setActionType(e.target.value)} className={input}>
            {ACTIONS.map((a) => <option key={a} value={a}>{t(`action.${a}`)}</option>)}
          </select>
        </div>
      </div>

      {actionType === 'SET_FUNNEL_STAGE' && (
        <div>
          <label className="block text-sm font-medium">{t('builder.funnelStage')}</label>
          <select value={funnelStage} onChange={(e) => setFunnelStage(e.target.value)} className={input}>
            {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}
      {actionType === 'ENROLL_SEQUENCE' && (
        <div>
          <label className="block text-sm font-medium">{t('builder.sequenceId')}</label>
          <input required value={sequenceId} onChange={(e) => setSequenceId(e.target.value)} className={input} placeholder="uuid" />
        </div>
      )}
      {actionType === 'NOTIFY' && (
        <div>
          <label className="block text-sm font-medium">{t('builder.note')}</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} className={input} />
        </div>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        {t('builder.enabledLabel')}
      </label>

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
