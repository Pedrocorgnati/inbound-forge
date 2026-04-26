import { Skeleton } from '@/components/ui/skeleton'

export default function ContentThemeLoading() {
  return (
    <div className="flex h-full gap-4">
      {/* Coluna principal — ângulos */}
      <div className="flex-1 space-y-4">
        <Skeleton variant="text" className="h-7 w-56" />
        <Skeleton variant="text" className="h-4 w-80" />

        <div className="space-y-3 mt-6">
          <Skeleton variant="rectangle" className="h-40 rounded-lg" />
          <Skeleton variant="rectangle" className="h-40 rounded-lg" />
          <Skeleton variant="rectangle" className="h-40 rounded-lg" />
        </div>
      </div>

      {/* Painel lateral — aprovação/preview */}
      <div className="w-80 space-y-4 shrink-0">
        <Skeleton variant="rectangle" className="h-48 rounded-lg" />
        <Skeleton variant="rectangle" className="h-32 rounded-lg" />
        <Skeleton variant="rectangle" className="h-24 rounded-lg" />
      </div>
    </div>
  )
}
