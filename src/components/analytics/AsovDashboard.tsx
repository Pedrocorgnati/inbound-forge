'use client'

/**
 * AsovDashboard — visao consolidada de ASoV por tema.
 * Intake Review TASK-8 ST004 (CL-160).
 */
import { useEffect, useState } from 'react'

type Period = '7d' | '30d'

interface ThemeRow {
  themeId: string
  rate: number
  total: number
  mentions: number
}

interface Payload {
  globalRate: number
  totalProbes: number
  totalMentions: number
  themes: ThemeRow[]
}

export function AsovDashboard() {
  const [period, setPeriod] = useState<Period>('30d')
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancel = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/v1/analytics/asov?period=${period}`, { credentials: 'include' })
        if (!res.ok) return
        const json = await res.json()
        if (!cancel) setData((json.data ?? json) as Payload)
      } finally {
        if (!cancel) setLoading(false)
      }
    })()
    return () => {
      cancel = true
    }
  }, [period])

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        {(['7d', '30d'] as Period[]).map((p) => (
          <button
            type="button"
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-full px-3 py-1 text-xs ${
              period === p ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      {data && (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <Kpi label="ASoV global" value={`${(data.globalRate * 100).toFixed(1)}%`} />
            <Kpi label="Probes" value={String(data.totalProbes)} />
            <Kpi label="Mentions" value={String(data.totalMentions)} />
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2">Tema</th>
                <th className="text-right">Taxa</th>
                <th className="text-right">Mentions</th>
                <th className="text-right">Probes</th>
              </tr>
            </thead>
            <tbody>
              {data.themes
                .slice()
                .sort((a, b) => b.rate - a.rate)
                .map((t) => (
                  <tr key={t.themeId} className="border-t border-border">
                    <td className="py-2 font-mono text-xs">{t.themeId}</td>
                    <td className="text-right">{(t.rate * 100).toFixed(1)}%</td>
                    <td className="text-right">{t.mentions}</td>
                    <td className="text-right">{t.total}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  )
}

export default AsovDashboard
