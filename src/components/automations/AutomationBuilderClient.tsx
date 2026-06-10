'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'
import { uuidv7 } from '@/lib/utils/uuidv7'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/components/ui/toast'

const TRIGGERS = ['LEAD_CREATED', 'LEAD_STATUS_CHANGED', 'LEAD_MQL'] as const
const ACTIONS = ['NOTIFY', 'SET_FUNNEL_STAGE', 'ENROLL_SEQUENCE'] as const
const STAGES = ['AWARENESS', 'CONSIDERATION', 'DECISION'] as const

export function AutomationBuilderClient() {
  const t = useTranslations('automations')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [trigger, setTrigger] = useState<string>('LEAD_CREATED')
  const [actionType, setActionType] = useState<string>('NOTIFY')
  const [enabled, setEnabled] = useState(true)
  const [funnelStage, setFunnelStage] = useState('AWARENESS')
  const [sequenceId, setSequenceId] = useState('')
  const [note, setNote] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
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
        toast.success(t('builder.saved'))
        setOpen(false)
        setName(''); setNote(''); setSequenceId('')
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
    <form onSubmit={onSubmit} data-testid="automation-builder" className="space-y-3 rounded-lg border p-4">
      <Input label={t('builder.name')} required value={name} onChange={(e) => setName(e.target.value)} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select label={t('builder.trigger')} value={trigger} onChange={(e) => setTrigger(e.target.value)} options={TRIGGERS.map((tr) => ({ value: tr, label: t(`trigger.${tr}`) }))} />
        <Select label={t('builder.action')} value={actionType} onChange={(e) => setActionType(e.target.value)} options={ACTIONS.map((a) => ({ value: a, label: t(`action.${a}`) }))} />
      </div>

      {actionType === 'SET_FUNNEL_STAGE' && (
        <Select label={t('builder.funnelStage')} value={funnelStage} onChange={(e) => setFunnelStage(e.target.value)} options={STAGES.map((s) => ({ value: s, label: s }))} />
      )}
      {actionType === 'ENROLL_SEQUENCE' && (
        <Input label={t('builder.sequenceId')} required value={sequenceId} onChange={(e) => setSequenceId(e.target.value)} placeholder="uuid" />
      )}
      {actionType === 'NOTIFY' && (
        <Input label={t('builder.note')} value={note} onChange={(e) => setNote(e.target.value)} />
      )}

      <Checkbox label={t('builder.enabledLabel')} checked={enabled} onCheckedChange={(v) => setEnabled(v === true)} />

      <div className="flex gap-2">
        <Button type="submit" isLoading={saving} loadingText={t('builder.saving')}>{t('builder.save')}</Button>
        <Button type="button" variant="ghost" size="icon" aria-label={t('builder.cancel')} onClick={() => setOpen(false)}>
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </form>
  )
}
