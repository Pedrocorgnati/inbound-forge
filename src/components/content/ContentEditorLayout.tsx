'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { SkeletonCard } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

interface ContentEditorLayoutProps {
  isLoading: boolean
  isGenerating: boolean
  hasAngles: boolean
  children: ReactNode
  className?: string
}

export function ContentEditorLayout({
  isLoading,
  isGenerating,
  hasAngles,
  children,
  className,
}: ContentEditorLayoutProps) {
  if (isLoading) {
    return (
      <div
        className={cn('grid gap-4 md:grid-cols-3', className)}
        data-testid="content-editor-layout-loading"
      >
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (isGenerating && !hasAngles) {
    return (
      <div
        className={cn('grid gap-4 md:grid-cols-3', className)}
        data-testid="content-editor-layout-generating"
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <Card
            key={i}
            className="flex flex-col items-center justify-center p-8 animate-pulse"
          >
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" aria-hidden />
            <p className="text-sm font-medium text-muted-foreground">Gerando...</p>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn('grid gap-4 md:grid-cols-3', className)}
      data-testid="content-editor-layout"
    >
      {children}
    </div>
  )
}
