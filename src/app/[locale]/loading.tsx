// RESOLVED: loading.tsx ausente (G003)
import { Skeleton } from '@/components/ui/skeleton'

export default function LocaleLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="space-y-3 w-64">
        <Skeleton variant="text" className="h-4 w-full" />
        <Skeleton variant="text" className="h-4 w-3/4" />
        <Skeleton variant="text" className="h-4 w-1/2" />
      </div>
    </div>
  )
}
