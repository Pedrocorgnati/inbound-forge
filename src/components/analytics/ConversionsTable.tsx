'use client'

/**
 * ConversionsTable — tabela com acoes inline de edit/delete/validar.
 * Intake Review TASK-5 ST004 (CL-238, CL-239, CL-094).
 */
import { useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Trash2, ShieldCheck } from 'lucide-react'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

export interface ConversionRow {
  id: string
  leadId: string
  type: string
  occurredAt: string
  amountBrl?: number | null
  channel?: string | null
  notes?: string | null
  manuallyValidated?: boolean | null
}

interface Props {
  rows: ConversionRow[]
  onChanged?: () => void
}

export function ConversionsTable({ rows, onChanged }: Props) {
  const [editing, setEditing] = useState<ConversionRow | null>(null)
  const [removing, setRemoving] = useState<ConversionRow | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleDelete() {
    if (!removing) return
    setBusy(true)
    try {
      const res = await fetch(`/api/v1/conversions/${removing.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error(String(res.status))
      toast.success('Conversao removida')
      onChanged?.()
    } catch {
      toast.error('Falha ao remover')
    } finally {
      setBusy(false)
      setRemoving(null)
    }
  }

  async function toggleValidated(row: ConversionRow) {
    try {
      const res = await fetch(`/api/v1/attribution/${row.id}/validate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ manuallyValidated: !row.manuallyValidated }),
      })
      if (!res.ok) throw new Error(String(res.status))
      toast.success('Validacao atualizada')
      onChanged?.()
    } catch {
      toast.error('Falha ao validar')
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground">
          <tr>
            <th className="py-2">Data</th>
            <th>Tipo</th>
            <th>Canal</th>
            <th className="text-right">Valor (BRL)</th>
            <th>Validacao</th>
            <th className="w-24 text-right">Acoes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-border">
              <td className="py-2">{new Date(row.occurredAt).toLocaleString()}</td>
              <td>{row.type}</td>
              <td>{row.channel ?? '—'}</td>
              <td className="text-right">
                {row.amountBrl != null ? row.amountBrl.toLocaleString('pt-BR') : '—'}
              </td>
              <td>
                {row.manuallyValidated ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                    <ShieldCheck className="h-3 w-3" /> Validado
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleValidated(row)}
                    className="text-xs text-primary hover:underline"
                  >
                    Marcar validado
                  </button>
                )}
              </td>
              <td className="text-right">
                <div className="inline-flex gap-1">
                  <button
                    type="button"
                    aria-label="Editar"
                    className="rounded p-1 hover:bg-muted"
                    onClick={() => setEditing(row)}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Remover"
                    className="rounded p-1 text-destructive hover:bg-destructive/10"
                    onClick={() => setRemoving(row)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={handleDelete}
        title="Remover conversao?"
        message="Esta acao tambem recalcula o score do tema associado."
        confirmText={busy ? 'Removendo...' : 'Remover'}
      />

      {editing && (
        <EditConversionDialog
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            onChanged?.()
          }}
        />
      )}
    </div>
  )
}

function EditConversionDialog({
  row,
  onClose,
  onSaved,
}: {
  row: ConversionRow
  onClose: () => void
  onSaved: () => void
}) {
  const [amountBrl, setAmount] = useState(row.amountBrl?.toString() ?? '')
  const [channel, setChannel] = useState(row.channel ?? '')
  const [notes, setNotes] = useState(row.notes ?? '')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const body: Record<string, unknown> = {}
      if (amountBrl !== '') body.amountBrl = Number(amountBrl)
      if (channel !== (row.channel ?? '')) body.channel = channel || null
      if (notes !== (row.notes ?? '')) body.notes = notes || null
      const res = await fetch(`/api/v1/conversions/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(String(res.status))
      toast.success('Atualizado')
      onSaved()
    } catch {
      toast.error('Falha ao salvar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <form
        className="w-full max-w-md rounded-lg bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <h3 className="mb-3 text-base font-semibold">Editar conversao</h3>
        <label className="mb-2 block text-sm">
          Valor (BRL)
          <input
            type="number"
            step="0.01"
            min="0"
            value={amountBrl}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded border border-border px-2 py-1"
          />
        </label>
        <label className="mb-2 block text-sm">
          Canal
          <input
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="mt-1 w-full rounded border border-border px-2 py-1"
          />
        </label>
        <label className="mb-3 block text-sm">
          Notas
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded border border-border px-2 py-1"
          />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded px-3 py-1.5 text-sm">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
          >
            {busy ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ConversionsTable
