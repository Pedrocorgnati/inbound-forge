// TASK-1 ST005 (CL-274) — loading.tsx escopado de analytics.

import { SkeletonCard } from '@/components/ui/skeleton'

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" data-testid="analytics-loading">
      <div className="space-y-2">
        <div className="h-8 w-56 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-96 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="h-64 animate-pulse rounded-md bg-muted" />
    </div>
  )
}
