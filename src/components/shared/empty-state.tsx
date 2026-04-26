'use client'

import React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  ctaLabel?: string
  /** Preferir `ctaHref` para navegação interna — suporta prefetch e Ctrl+Click. */
  ctaHref?: string
  onCtaClick?: () => void
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  ctaLabel,
  ctaHref,
  onCtaClick,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-8 px-4 text-center md:py-12 lg:py-16',
        className
      )}
    >
      <div className="h-12 w-12 text-muted-foreground">{icon}</div>
      <h2 className="mt-4 text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {ctaLabel && ctaHref && (
        <Button asChild className="mt-6">
          <Link href={ctaHref}>{ctaLabel}</Link>
        </Button>
      )}
      {ctaLabel && !ctaHref && onCtaClick && (
        <Button className="mt-6" onClick={onCtaClick}>
          {ctaLabel}
        </Button>
      )}
    </div>
  )
}
