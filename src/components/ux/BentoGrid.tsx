'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/* ---------- Layout presets ---------- */
const LAYOUT_CLASSES = {
  default: 'grid-cols-1 md:grid-cols-6 lg:grid-cols-12',
  compact: 'grid-cols-1 md:grid-cols-4 lg:grid-cols-8',
  wide: 'grid-cols-1 md:grid-cols-6 lg:grid-cols-12',
} as const

type BentoLayout = keyof typeof LAYOUT_CLASSES

/* ---------- BentoGrid ---------- */
interface BentoGridProps {
  children: React.ReactNode
  layout?: BentoLayout
  className?: string
}

export function BentoGrid({ children, layout = 'default', className }: BentoGridProps) {
  return (
    <div
      data-testid="bento-grid"
      className={cn('grid gap-4', LAYOUT_CLASSES[layout], className)}
    >
      {children}
    </div>
  )
}

/* ---------- BentoCell ---------- */
const COL_SPAN: Record<number, string> = {
  1: 'col-span-1',
  2: 'col-span-1 md:col-span-2',
  3: 'col-span-1 md:col-span-3',
  4: 'col-span-1 md:col-span-3 lg:col-span-4',
  5: 'col-span-1 md:col-span-3 lg:col-span-5',
  6: 'col-span-1 md:col-span-6',
  7: 'col-span-1 md:col-span-6 lg:col-span-7',
  8: 'col-span-1 md:col-span-6 lg:col-span-8',
  9: 'col-span-1 md:col-span-6 lg:col-span-9',
  10: 'col-span-1 md:col-span-6 lg:col-span-10',
  11: 'col-span-1 md:col-span-6 lg:col-span-11',
  12: 'col-span-1 md:col-span-6 lg:col-span-12',
}

const ROW_SPAN: Record<number, string> = {
  1: 'row-span-1',
  2: 'row-span-2',
  3: 'row-span-3',
}

interface BentoCellProps {
  colSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
  rowSpan?: 1 | 2 | 3
  children: React.ReactNode
  className?: string
}

export function BentoCell({ colSpan = 6, rowSpan = 1, children, className }: BentoCellProps) {
  return (
    <div
      data-testid="bento-cell"
      className={cn(
        COL_SPAN[colSpan],
        ROW_SPAN[rowSpan],
        'rounded-xl border border-border bg-card p-4',
        className
      )}
    >
      {children}
    </div>
  )
}
