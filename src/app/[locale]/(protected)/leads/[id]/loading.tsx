import { Skeleton } from '@/components/ui/skeleton'

export default function LeadDetailLoading() {
  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton variant="text" className="h-7 w-48" />
        <Skeleton variant="text" className="h-4 w-72" />
      </div>

      {/* Badges */}
      <div className="flex gap-2">
        <Skeleton variant="rectangle" className="h-6 w-20 rounded-full" />
        <Skeleton variant="rectangle" className="h-6 w-24 rounded-full" />
      </div>

      {/* Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton variant="rectangle" className="h-32 rounded-lg" />
        <Skeleton variant="rectangle" className="h-32 rounded-lg" />
      </div>

      {/* Conversion history */}
      <div className="space-y-3">
        <Skeleton variant="text" className="h-5 w-40" />
        <Skeleton variant="rectangle" className="h-16 rounded-lg" />
        <Skeleton variant="rectangle" className="h-16 rounded-lg" />
      </div>
    </div>
  )
}
