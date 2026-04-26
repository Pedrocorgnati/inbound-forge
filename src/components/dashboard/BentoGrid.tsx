'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { ThemeCard } from './ThemeCard'
import type { ThemeDto } from '@/hooks/useThemes'
import { useRovingTabIndex } from '@/hooks/useRovingTabIndex'
import { resolveSpan } from './AdaptiveBentoCard'

// TASK-13 ST003 (CL-133): span derivado de score (finalScore || conversionScore)
// em vez de posicao no grid. Cards com score >= 50 ficam wide.
function getCardScore(theme: ThemeDto): number {
  return theme.scoreBreakdown?.finalScore ?? theme.conversionScore ?? 0
}

function isWideCard(theme: ThemeDto): boolean {
  const span = resolveSpan(getCardScore(theme))
  return span === 'hero' || span === 'wide'
}

function skeletonIsWide(index: number): boolean {
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
            skeletonIsWide(i) ? 'md:col-span-2 lg:col-span-2' : ''
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
  const { getItemProps } = useRovingTabIndex({
    itemsCount: themes.length,
    columns: 3,
  })

  if (isLoading) return <BentoGridSkeleton />

  return (
    <div
      role="grid"
      aria-label="Grade de temas"
      className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
    >
      {themes.map((theme, index) => {
        const { ref, tabIndex, onKeyDown, onFocus, ...rest } = getItemProps(index)
        const score = getCardScore(theme)
        const span = resolveSpan(score)
        const spanClass =
          span === 'hero'
            ? 'col-span-1 md:col-span-2 lg:col-span-2 row-span-2'
            : span === 'wide'
              ? 'col-span-1 md:col-span-2 lg:col-span-2'
              : 'col-span-1'
        return (
          <div
            key={theme.id}
            role="gridcell"
            data-testid="card"
            data-bento-span={span}
            data-bento-score={score}
            aria-label={`Tema ${theme.title ?? theme.id}`}
            ref={ref as React.Ref<HTMLDivElement>}
            tabIndex={tabIndex}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            className={`${spanClass} focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 rounded-xl`}
            {...rest}
          >
            <ThemeCard
              theme={theme}
              isWide={isWideCard(theme)}
              onReject={onReject}
              onRestore={onRestore}
              onMutate={onMutate}
            />
          </div>
        )
      })}
    </div>
  )
}
