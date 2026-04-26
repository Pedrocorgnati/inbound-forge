'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

interface Slot {
  weekday: Weekday
  time: string
}

const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

const DEFAULT_SLOTS: Slot[] = [
  { weekday: 'mon', time: '09:00' },
  { weekday: 'wed', time: '09:00' },
  { weekday: 'fri', time: '14:00' },
]

export function ScheduleEditor() {
  const t = useTranslations('settings.schedule')
  const [slots, setSlots] = useState<Slot[]>(DEFAULT_SLOTS)
  const [timezone, setTimezone] = useState('America/Sao_Paulo')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/v1/settings/schedule')
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.data) {
          setSlots(j.data.slots ?? DEFAULT_SLOTS)
          setTimezone(j.data.timezone ?? 'America/Sao_Paulo')
        }
      })
      .catch(() => {})
  }, [])

  function addSlot(weekday: Weekday) {
    setSlots((s) => [...s, { weekday, time: '09:00' }])
  }

  function updateSlot(i: number, patch: Partial<Slot>) {
    setSlots((s) => s.map((slot, idx) => (idx === i ? { ...slot, ...patch } : slot)))
  }

  function removeSlot(i: number) {
    setSlots((s) => s.filter((_, idx) => idx !== i))
  }

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/v1/settings/schedule', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slots, timezone }),
      })
      const j = await res.json()
      setMessage(j.success ? 'Agenda salva.' : j.error ?? 'Erro ao salvar.')
    } catch {
      setMessage('Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 max-w-xs">
        <Label htmlFor="tz">{t('timezone')}</Label>
        <Input id="tz" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
      </div>

      <div className="space-y-3">
        {WEEKDAYS.map((wd) => {
          const daySlots = slots.filter((s) => s.weekday === wd)
          return (
            <div key={wd} className="rounded-md border bg-card p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">{t(`weekday.${wd}`)}</h3>
                <Button size="sm" variant="outline" onClick={() => addSlot(wd)}>
                  <Plus className="h-4 w-4" /> {t('addSlot')}
                </Button>
              </div>
              {daySlots.length === 0 ? (
                <p className="text-xs text-muted-foreground">—</p>
              ) : (
                <ul className="space-y-2">
                  {daySlots.map((slot, i) => {
                    const absoluteIdx = slots.indexOf(slot)
                    return (
                      <li key={`${wd}-${i}`} className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={slot.time}
                          onChange={(e) => updateSlot(absoluteIdx, { time: e.target.value })}
                          className="w-32"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeSlot(absoluteIdx)}
                          aria-label={t('removeSlot')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar agenda'}
        </Button>
        {message && <span className="text-xs text-muted-foreground">{message}</span>}
      </div>
    </div>
  )
}
