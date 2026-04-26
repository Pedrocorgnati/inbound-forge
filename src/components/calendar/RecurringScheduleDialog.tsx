'use client'

// RecurringScheduleDialog — cria agendamento recorrente (TASK-14 ST001 / CL-119)

import { useState } from 'react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'

const PRESETS = [
  { id: 'daily', label: 'Diario', rrule: 'FREQ=DAILY' },
  { id: 'weekly', label: 'Semanal', rrule: 'FREQ=WEEKLY' },
  { id: 'twice', label: '2x/semana (Ter+Qui)', rrule: 'FREQ=WEEKLY;BYDAY=TU,TH' },
  { id: 'custom', label: 'Personalizado', rrule: '' },
]

interface Props {
  baseDraftId: string
  onClose: () => void
  onCreated?: (parentId: string, count: number) => void
}

export function RecurringScheduleDialog({ baseDraftId, onClose, onCreated }: Props) {
  const [presetId, setPresetId] = useState('weekly')
  const [customRrule, setCustomRrule] = useState('FREQ=WEEKLY;BYDAY=MO,WE,FR')
  const [startAt, setStartAt] = useState(() => new Date().toISOString().slice(0, 16))
  const [until, setUntil] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().slice(0, 16)
  })
  const [preview, setPreview] = useState<string[] | null>(null)
  const [busy, setBusy] = useState(false)

  const rrule = presetId === 'custom'
    ? customRrule
    : PRESETS.find((p) => p.id === presetId)?.rrule ?? ''

  async function handlePreview() {
    setBusy(true)
    try {
      const res = await apiClient('/api/v1/posts/recurring', {
        method: 'POST',
        body: JSON.stringify({
          baseDraftId,
          rrule,
          startAt: new Date(startAt).toISOString(),
          until: new Date(until).toISOString(),
          previewOnly: true,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { occurrences: string[]; total: number }
      setPreview(data.occurrences)
      if (data.total === 0) toast.warning('Nenhuma ocorrencia gerada — revise a regra')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao prever')
    } finally {
      setBusy(false)
    }
  }

  async function handleConfirm() {
    setBusy(true)
    try {
      const res = await apiClient('/api/v1/posts/recurring', {
        method: 'POST',
        body: JSON.stringify({
          baseDraftId,
          rrule,
          startAt: new Date(startAt).toISOString(),
          until: new Date(until).toISOString(),
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { parentId: string; created: number }
      toast.success(`${data.created} posts criados`)
      onCreated?.(data.parentId, data.created)
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao criar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Agendamento recorrente"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
    >
      <div className="w-full max-w-lg space-y-4 rounded-lg bg-background p-6 shadow-lg">
        <header>
          <h2 className="text-lg font-semibold">Agendar recorrencia</h2>
          <p className="text-xs text-muted-foreground">Limite: 1 ano ou 200 ocorrencias</p>
        </header>

        <label className="block space-y-1 text-sm">
          <span>Preset</span>
          <select
            value={presetId}
            onChange={(e) => setPresetId(e.target.value)}
            className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
          >
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        {presetId === 'custom' && (
          <label className="block space-y-1 text-sm">
            <span>RRULE customizada</span>
            <input
              value={customRrule}
              onChange={(e) => setCustomRrule(e.target.value)}
              className="w-full rounded border border-input bg-background px-3 py-2 font-mono text-xs"
            />
          </label>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span>Inicio</span>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Ate</span>
            <input
              type="datetime-local"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
              className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
        </div>

        {preview && preview.length > 0 && (
          <div className="rounded border border-dashed p-3 text-xs">
            <p className="mb-1 font-medium">Proximas ocorrencias (10 primeiras):</p>
            <ul className="space-y-0.5 font-mono">
              {preview.map((d) => (
                <li key={d}>{new Date(d).toLocaleString('pt-BR')}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-input bg-background px-4 py-2 text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handlePreview()}
            disabled={busy}
            className="rounded border border-primary px-4 py-2 text-sm text-primary disabled:opacity-50"
          >
            Preview
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={busy || !rrule}
            className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {busy ? 'Criando…' : 'Criar recorrencia'}
          </button>
        </div>
      </div>
    </div>
  )
}
