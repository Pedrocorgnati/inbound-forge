import { cn } from '@/lib/utils'

interface ProgressCounterProps {
  label: string
  current: number
  threshold: number
  className?: string
}

export function ProgressCounter({
  label,
  current,
  threshold,
  className,
}: ProgressCounterProps) {
  const percentage = Math.min(Math.round((current / threshold) * 100), 100)
  const isComplete = current >= threshold
  const isPartial = current > 0 && !isComplete

  return (
    <div className={cn('space-y-1.5', className)} data-testid={`progress-counter-${label.toLowerCase()}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span
          className={cn(
            'tabular-nums',
            isComplete && 'text-success',
            isPartial && 'text-warning',
            !isPartial && !isComplete && 'text-muted-foreground'
          )}
        >
          {current}/{threshold}
        </span>
      </div>

      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={threshold}
        aria-valuenow={current}
        aria-label={`${label}: ${current} de ${threshold}`}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-500 ease-out', // RESOLVED: transition-all → transition-[width] (G011)
            isComplete && 'bg-success',
            isPartial && 'bg-warning',
            !isPartial && !isComplete && 'bg-muted-foreground/30'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
