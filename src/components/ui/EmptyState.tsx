'use client'

// TASK-1 ST001 (CL-274) — Empty state canonico em `@/components/ui`.
// Wrapper sobre `@/components/shared/empty-state` que adiciona variantes
// semanticas (`noData` | `noResults` | `error`) e alinha os nomes de props
// com a convencao global (`actionLabel`, `onAction`).

import * as React from 'react'
import { AlertTriangle, Inbox, SearchX } from 'lucide-react'
import { EmptyState as SharedEmptyState } from '@/components/shared/empty-state'

export type EmptyStateVariant = 'noData' | 'noResults' | 'error'

const VARIANT_ICON: Record<EmptyStateVariant, React.ReactNode> = {
  noData: <Inbox className="h-12 w-12" aria-hidden />,
  noResults: <SearchX className="h-12 w-12" aria-hidden />,
  error: <AlertTriangle className="h-12 w-12" aria-hidden />,
}

export interface EmptyStateProps {
  title: string
  description?: string
  variant?: EmptyStateVariant
  /** Icone custom — prioridade sobre o icone da variant */
  icon?: React.ReactNode
  /** Rotulo do CTA. Se ausente, CTA nao renderiza. */
  actionLabel?: string
  /** Handler programatico do CTA */
  onAction?: () => void
  /** Link interno do CTA (prefere-se em relacao a `onAction`) */
  actionHref?: string
  className?: string
}

export function EmptyState({
  title,
  description,
  variant = 'noData',
  icon,
  actionLabel,
  onAction,
  actionHref,
  className,
}: EmptyStateProps) {
  return (
    <SharedEmptyState
      icon={icon ?? VARIANT_ICON[variant]}
      title={title}
      description={description ?? ''}
      ctaLabel={actionLabel}
      ctaHref={actionHref}
      onCtaClick={onAction}
      className={className}
    />
  )
}
