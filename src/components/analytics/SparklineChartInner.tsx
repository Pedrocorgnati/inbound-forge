'use client'

// Importado via dynamic() no SparklineChart.tsx — ssr:false

import React from 'react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface SparklineChartInnerProps {
  trend: number[]
}

export default function SparklineChartInner({ trend }: SparklineChartInnerProps) {
  const prefersReducedMotion = useReducedMotion()
  const isGrowing = trend[trend.length - 1] >= trend[0]
  const color = isGrowing ? '#22C55E' : '#EF4444'
  const data = trend.map((value, i) => ({ value, i }))

  return (
    <ResponsiveContainer width={80} height={30}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={!prefersReducedMotion} // G06: RESOLVED
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
