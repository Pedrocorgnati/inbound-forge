'use client'

import { cn } from '@/lib/utils'

const RADIUS = 40
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function getScoreColor(score: number): string {
  if (score >= 67) return '#10B981'
  if (score >= 34) return '#F59E0B'
  return '#EF4444'
}

function getScoreBgColor(score: number): string {
  if (score >= 67) return '#D1FAE5'
  if (score >= 34) return '#FEF3C7'
  return '#FEE2E2'
}

interface ScoreGaugeProps {
  score: number
  size?: 'sm' | 'md'
  className?: string
}

export function ScoreGauge({ score, size = 'sm', className }: ScoreGaugeProps) {
  const strokeDasharray = (score / 100) * CIRCUMFERENCE
  const color = getScoreColor(score)
  const bgColor = getScoreBgColor(score)
  const sizeClass = size === 'md' ? 'h-16 w-16' : 'h-12 w-12'

  return (
    <svg
      viewBox="0 0 100 100"
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={score}
      aria-label={`Score: ${score} de 100`}
      className={cn(sizeClass, 'shrink-0', className)}
    >
      <circle
        cx={50}
        cy={50}
        r={RADIUS}
        fill="none"
        stroke={bgColor}
        strokeWidth={8}
      />
      <circle
        cx={50}
        cy={50}
        r={RADIUS}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeDasharray={`${strokeDasharray} ${CIRCUMFERENCE}`}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dasharray 300ms ease-out' }}
      />
      <text
        x={50}
        y={55}
        textAnchor="middle"
        fill={color}
        fontSize={22}
        fontWeight="bold"
      >
        {score}
      </text>
    </svg>
  )
}
