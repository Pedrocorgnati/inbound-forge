'use client'

// WorkerLogsStream — polling SWR-like simples para /api/workers/[worker]/logs (TASK-7 ST005)

import { useEffect, useRef, useState } from 'react'

type LogEntry = {
  id: string
  source: 'audit' | 'alert'
  severity: 'info' | 'warn' | 'error'
  message: string
  createdAt: string
  metadata?: unknown
}

type Props = {
  worker: 'scraping' | 'image' | 'video' | 'publishing'
  intervalMs?: number
}

export function WorkerLogsStream({ worker, intervalMs = 5000 }: Props) {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const latestTs = useRef<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false

    async function tick() {
      try {
        const qs = latestTs.current ? `?since=${encodeURIComponent(latestTs.current)}` : ''
        const res = await fetch(`/api/workers/${worker}/logs${qs}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as { entries: LogEntry[] }
        if (cancelled) return
        if (data.entries.length > 0) {
          const fresh = data.entries
          setEntries((prev) => {
            const seen = new Set(prev.map((e) => e.id))
            const merged = [...fresh.filter((e) => !seen.has(e.id)), ...prev]
            return merged.slice(0, 500)
          })
          latestTs.current = fresh[0]?.createdAt ?? latestTs.current
        }
        setError(null)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'falha')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void tick()
    const id = setInterval(() => void tick(), intervalMs)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [worker, intervalMs])

  return (
    <div
      ref={scrollRef}
      className="max-h-80 overflow-auto rounded border bg-black/90 p-3 font-mono text-xs text-green-200"
      data-testid={`worker-logs-${worker}`}
    >
      {loading && <p className="text-muted-foreground">carregando logs...</p>}
      {error && <p className="text-red-400">erro: {error}</p>}
      {!loading && entries.length === 0 && (
        <p className="text-muted-foreground">sem entradas recentes nos ultimos 15min.</p>
      )}
      {entries.map((e) => (
        <div key={e.id} className="mb-1 whitespace-pre-wrap">
          <span className="text-yellow-400">
            {new Date(e.createdAt).toLocaleTimeString()}
          </span>{' '}
          <span
            className={
              e.severity === 'error'
                ? 'text-red-400'
                : e.severity === 'warn'
                  ? 'text-orange-300'
                  : 'text-green-200'
            }
          >
            [{e.source}]
          </span>{' '}
          {e.message}
        </div>
      ))}
    </div>
  )
}
