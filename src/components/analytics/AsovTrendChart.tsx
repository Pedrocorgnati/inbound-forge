'use client'

// AsovTrendChart — tendencia de ASoV ultimos 30 dias (TASK-13 ST004 / CL-139)

import { useMemo } from 'react'
import {
  ResponsiveContainer,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ComposedChart,
  Legend,
} from 'recharts'

interface AsovPoint {
  date: string
  rate: number
  mentions: number
  total: number
}

interface Props {
  data: AsovPoint[]
}

function movingAverage(values: number[], window = 7): number[] {
  return values.map((_, idx) => {
    const start = Math.max(0, idx - window + 1)
    const slice = values.slice(start, idx + 1)
    const sum = slice.reduce((a, b) => a + b, 0)
    return slice.length === 0 ? 0 : sum / slice.length
  })
}

export function AsovTrendChart({ data }: Props) {
  const enriched = useMemo(() => {
    const rates = data.map((d) => d.rate)
    const ma = movingAverage(rates, 7)
    return data.map((d, idx) => ({
      ...d,
      ratePct: Math.round(d.rate * 1000) / 10,
      maPct: Math.round(ma[idx] * 1000) / 10,
    }))
  }, [data])

  if (data.every((d) => d.total === 0)) {
    return (
      <div className="rounded border border-dashed p-8 text-center text-sm text-muted-foreground">
        Ainda sem dados suficientes para a tendencia de ASoV.
      </div>
    )
  }

  return (
    <div className="space-y-2" data-testid="asov-trend-chart">
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={enriched}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
          <Tooltip
            formatter={(value: number, name: string) =>
              name === 'maPct' ? [`${value.toFixed(1)}%`, 'Media 7d'] : [`${value.toFixed(1)}%`, 'ASoV']
            }
          />
          <Legend />
          <Area dataKey="maPct" name="Media 7d" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.1)" />
          <Line dataKey="ratePct" name="ASoV diario" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Tabela alternativa para a11y (sr-only) */}
      <table className="sr-only" aria-label="ASoV diario">
        <thead>
          <tr>
            <th>Data</th>
            <th>ASoV (%)</th>
            <th>Mencoes</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {enriched.map((d) => (
            <tr key={d.date}>
              <td>{d.date}</td>
              <td>{d.ratePct}</td>
              <td>{d.mentions}</td>
              <td>{d.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
