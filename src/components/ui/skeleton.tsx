import * as React from 'react'
import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circle' | 'rectangle'
}

function Skeleton({ className, variant = 'rectangle', ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-muted',
        variant === 'text' && 'h-4 w-full rounded',
        variant === 'circle' && 'rounded-full',
        variant === 'rectangle' && 'rounded-md',
        className
      )}
      aria-hidden="true"
      {...props}
    />
  )
}

function SkeletonCard() {
  return (
    <div role="status" aria-label="Carregando...">
      <div className="rounded-lg border border-border p-5 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton variant="circle" className="h-10 w-10 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" className="w-3/4" />
            <Skeleton variant="text" className="w-1/2" />
          </div>
        </div>
        <Skeleton variant="text" />
        <Skeleton variant="text" className="w-5/6" />
      </div>
      <span className="sr-only">Carregando conteúdo...</span>
    </div>
  )
}

export { Skeleton, SkeletonCard }
