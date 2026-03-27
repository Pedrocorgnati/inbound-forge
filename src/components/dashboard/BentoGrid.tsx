'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { ThemeCard } from './ThemeCard'
import type { ThemeDto } from '@/hooks/useThemes'

function isWideCard(index: number): boolean {
  const posInGroup = index % 5
  return posInGroup === 0 || posInGroup === 3
}

interface BentoGridProps {
  themes: ThemeDto[]
  isLoading: boolean
  onReject: (themeId: string, reason: string) => Promise<boolean>
  onRestore: (themeId: string) => Promise<boolean>
  onMutate: () => void
}

function BentoGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Carregando temas...">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={`rounded-xl border border-border p-5 space-y-3 ${
            isWideCard(i) ? 'md:col-span-2 lg:col-span-2' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton variant="circle" className="h-12 w-12" />
          </div>
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
      <span className="sr-only">Carregando temas...</span>
    </div>
  )
}

export function BentoGrid({ themes, isLoading, onReject, onRestore, onMutate }: BentoGridProps) {
  if (isLoading) return <BentoGridSkeleton />

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {themes.map((theme, index) => (
        <ThemeCard
          key={theme.id}
          theme={theme}
          isWide={isWideCard(index)}
          onReject={onReject}
          onRestore={onRestore}
          onMutate={onMutate}
        />
      ))}
    </div>
  )
}
