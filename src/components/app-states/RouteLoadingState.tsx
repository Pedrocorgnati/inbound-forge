import { Skeleton, SkeletonCard } from '@/components/ui/skeleton'

interface RouteLoadingStateProps {
  title?: string
  description?: string
  rows?: number
}

export function RouteLoadingState({
  title = 'Carregando dados',
  description = 'Preparando os dados desta area.',
  rows = 3,
}: RouteLoadingStateProps) {
  return (
    <section
      className="space-y-6"
      aria-busy="true"
      aria-label={title}
      data-testid="route-loading-state"
    >
      <div className="space-y-2">
        <Skeleton variant="text" className="h-7 w-64 max-w-full" />
        <Skeleton variant="text" className="h-4 w-96 max-w-full" />
        <span className="sr-only">
          {title}. {description}
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: rows }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
      <div className="rounded-lg border border-border p-4">
        <Skeleton variant="text" className="mb-3 h-4 w-32" />
        <div className="space-y-2">
          <Skeleton variant="text" className="h-3 w-full" />
          <Skeleton variant="text" className="h-3 w-11/12" />
          <Skeleton variant="text" className="h-3 w-4/5" />
        </div>
      </div>
    </section>
  )
}
