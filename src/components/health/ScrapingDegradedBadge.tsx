'use client'
/**
 * TASK-2/ST002 — Badge que sinaliza modo degradado do motor (scraping unhealthy).
 * Gap CL-031 / Zero Silencio.
 */
import useSWR from 'swr'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface ScrapingHealth {
  degraded: boolean
  status: string
  thresholdHours: number
  reason?: string
}

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json())

export function ScrapingDegradedBadge() {
  const { data } = useSWR<ScrapingHealth>('/api/v1/health/scraping', fetcher, {
    refreshInterval: 60_000,
  })
  if (!data?.degraded) return null

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="warning"
            className="border-amber-400 bg-amber-50 text-amber-900"
            data-testid="scraping-degraded-badge"
          >
            Motor em modo degradado (sem scraping)
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="max-w-xs text-xs">
            Scraping indisponivel (status: {data.status}). Motor opera apenas com pain_library e
            case_library internas. Temas gerados marcam{' '}
            <code className="rounded bg-muted px-1">mode=internal-only</code>.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
