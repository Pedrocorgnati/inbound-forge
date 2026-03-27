'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  ctaLabel?: string
  onCtaClick?: () => void
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  ctaLabel,
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
      {ctaLabel && onCtaClick && (
        <Button className="mt-6" onClick={onCtaClick}>
          {ctaLabel}
        </Button>
      )}
    </div>
  )
}
