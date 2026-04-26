'use client'

/**
 * AdaptiveBentoCard — TASK-13 ST002 (CL-133)
 *
 * Wrapper em torno de um card do bento grid que ajusta o span automaticamente
 * com base em um score (0-100). Substitui a heuristica posicional
 * `isWideCard(index)` por uma regra baseada em valor de negocio.
 *
 *   score >= 80 -> col-span-2 row-span-2 (card "hero")
 *   score 50-79 -> col-span-2           (card "wide")
 *   score <  50 -> col-span-1           (card padrao)
 */

import { clsx } from 'clsx'
import type { ReactNode } from 'react'

export interface AdaptiveBentoCardProps {
  score: number | null | undefined
  children?: ReactNode
  className?: string
  /** Override manual do span. Quando setado, ignora score. */
  forceSpan?: 'hero' | 'wide' | 'default'
  /** Test-id exposto para asserts em testes. */
  testId?: string
}

export type BentoSpan = 'hero' | 'wide' | 'default'

export function resolveSpan(score: number | null | undefined, force?: BentoSpan): BentoSpan {
  if (force) return force
  if (typeof score !== 'number' || !Number.isFinite(score)) return 'default'
  if (score >= 80) return 'hero'
  if (score >= 50) return 'wide'
  return 'default'
}

const SPAN_CLASSES: Record<BentoSpan, string> = {
  hero: 'col-span-2 row-span-2 md:col-span-2 lg:col-span-2',
  wide: 'col-span-2 md:col-span-2 lg:col-span-2',
  default: 'col-span-1',
}

export function AdaptiveBentoCard({
  score,
  children,
  className,
  forceSpan,
  testId = 'card',
}: AdaptiveBentoCardProps) {
  const span = resolveSpan(score, forceSpan)
  return (
    <div
      data-testid={testId}
      data-bento-span={span}
      data-bento-score={typeof score === 'number' ? score : 'unknown'}
      className={clsx(
        SPAN_CLASSES[span],
        'focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 rounded-xl',
        className,
      )}
    >
      {children}
    </div>
  )
}
