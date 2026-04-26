'use client'

// DLQPanel — lista ImageJob DEAD_LETTER + reprocess selecionados
// Intake-Review TASK-12 ST005 (CL-CG-011/038).

import { useEffect, useState } from 'react'

type DLQJob = {
  id: string
  contentPieceId: string | null
  retryCount: number
  errorMessage: string | null
  updatedAt: string
}

export function DLQPanel({ className }: { className?: string }) {
  const [jobs, setJobs] = useState<DLQJob[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function load() {
    setError(null)
    try {
      const res = await fetch('/api/v1/images?status=DEAD_LETTER&limit=100')
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? 'Falha ao carregar')
      setJobs((json.data ?? []) as DLQJob[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar DLQ')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const reprocessSelected = async () => {
    if (selected.size === 0) return
    if (!confirm(`Reprocessar ${selected.size} job(s) do DLQ?`)) return
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      const res = await fetch('/api/v1/images/dlq/reprocess', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jobIds: Array.from(selected) }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? 'Falha no reprocess')
      setInfo(`Processados: ${json.data?.processed ?? 0}, ignorados: ${json.data?.skipped ?? 0}`)
      setSelected(new Set())
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no reprocess')
    } finally {
      setBusy(false)
    }
  }

  const reprocessAll = async () => {
    if (!confirm('Reprocessar TODOS os jobs do DLQ (max 100 por chamada)?')) return
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      const res = await fetch('/api/v1/images/dlq/reprocess', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? 'Falha no reprocess')
      setInfo(`Processados: ${json.data?.processed ?? 0}, ignorados: ${json.data?.skipped ?? 0}`)
      setSelected(new Set())
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no reprocess')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={className} data-testid="dlq-panel">
      <header className="flex items-center justify-between border-b pb-2">
        <h2 className="text-sm font-semibold">Dead-Letter Queue — ImageJobs</h2>
        <div className="space-x-2">
          <button
            type="button"
            onClick={() => void reprocessSelected()}
            disabled={busy || selected.size === 0}
            className="rounded border bg-card px-3 py-1 text-xs hover:bg-muted/40 disabled:opacity-50"
            data-testid="dlq-reprocess-selected"
          >
            {busy ? 'Reprocessando...' : `Reprocessar selecionados (${selected.size})`}
          </button>
          <button
            type="button"
            onClick={() => void reprocessAll()}
            disabled={busy || jobs.length === 0}
            className="rounded border bg-card px-3 py-1 text-xs hover:bg-muted/40 disabled:opacity-50"
            data-testid="dlq-reprocess-all"
          >
            Reprocessar todos
          </button>
        </div>
      </header>

      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
      {info && (
        <p role="status" className="mt-2 text-xs text-muted-foreground">
          {info}
        </p>
      )}

      {jobs.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">DLQ vazia.</p>
      ) : (
        <table className="mt-4 w-full text-sm" data-testid="dlq-table">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-2 py-1"> </th>
              <th className="px-2 py-1">ID</th>
              <th className="px-2 py-1">ContentPiece</th>
              <th className="px-2 py-1">Retry</th>
              <th className="px-2 py-1">Erro</th>
              <th className="px-2 py-1">Atualizado</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id} className="border-t">
                <td className="px-2 py-1">
                  <input
                    type="checkbox"
                    checked={selected.has(j.id)}
                    onChange={() => toggle(j.id)}
                    aria-label={`Selecionar ${j.id}`}
                  />
                </td>
                <td className="px-2 py-1 font-mono text-xs">{j.id.slice(0, 8)}</td>
                <td className="px-2 py-1 font-mono text-xs">
                  {j.contentPieceId ? j.contentPieceId.slice(0, 8) : '-'}
                </td>
                <td className="px-2 py-1">{j.retryCount}</td>
                <td className="px-2 py-1 text-xs text-muted-foreground" title={j.errorMessage ?? ''}>
                  {j.errorMessage ? j.errorMessage.slice(0, 60) + (j.errorMessage.length > 60 ? '…' : '') : '-'}
                </td>
                <td className="px-2 py-1 text-xs text-muted-foreground">
                  {new Date(j.updatedAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
