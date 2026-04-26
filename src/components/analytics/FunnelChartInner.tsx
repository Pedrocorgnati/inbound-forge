'use client'

// FunnelChartInner — importado via dynamic() no FunnelChart.tsx
// Separado para garantir ssr:false sem afetar o bundle do servidor

import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { FunnelMetrics } from '@/types/analytics'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useFormatters } from '@/lib/i18n/formatters'

interface FunnelChartInnerProps {
  data: FunnelMetrics
  onStageClick?: (stageLabel: string) => void
}

const BAR_COLOR = '#4F46E5' // indigo-600

interface CustomTooltipPayload {
  payload?: { label: string; count: number; conversionRate: number }
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: CustomTooltipPayload[] }) {
  // RESOLVED: G002 — useFormatters usa locale dinâmico
  const fmt = useFormatters()
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 shadow-md text-sm">
      <p className="font-medium text-foreground">{d.label}</p>
      <p className="text-muted-foreground">{fmt.number(d.count)} registros</p>
      <p className="text-muted-foreground">Taxa: {d.conversionRate}%</p>
    </div>
  )
}

export default function FunnelChartInner({ data, onStageClick }: FunnelChartInnerProps) {
  const prefersReducedMotion = useReducedMotion()
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data.stages}
        margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
        onClick={(state) => {
          if (state?.activeLabel && onStageClick) {
            onStageClick(state.activeLabel)
          }
        }}
        style={{ cursor: onStageClick ? 'pointer' : undefined }}
      >
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={50}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={!prefersReducedMotion}> {/* G06: RESOLVED */}
          {data.stages.map((_, i) => (
            <Cell
              key={`cell-${i}`}
              fill={BAR_COLOR}
              fillOpacity={1 - i * 0.12}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
