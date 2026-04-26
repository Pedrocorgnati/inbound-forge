'use client'

import { useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
  threshold?: number
  className?: string
  'data-testid'?: string
}

const DEFAULT_THRESHOLD = 72

/**
 * PullToRefresh — gesto pull-down para atualizar conteúdo em mobile.
 * MOBILE-GUIDE §3.7: threshold 72px, indicador visual, scroll position check.
 */
export function PullToRefresh({
  onRefresh,
  children,
  threshold = DEFAULT_THRESHOLD,
  className,
  'data-testid': testId = 'pull-to-refresh',
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startY = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  function handleTouchStart(e: React.TouchEvent) {
    // Só iniciar pull se estiver no topo
    if (containerRef.current && containerRef.current.scrollTop > 0) return
    startY.current = e.touches[0].clientY
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (startY.current === null || isRefreshing) return
    const delta = e.touches[0].clientY - startY.current
    if (delta <= 0) { setPullDistance(0); return }
    // Resistência progressiva
    const resistance = delta > threshold ? threshold + (delta - threshold) * 0.3 : delta
    setPullDistance(Math.min(resistance, threshold + 40))
  }

  async function handleTouchEnd() {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      setPullDistance(threshold)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
    startY.current = null
  }

  const progress = Math.min(pullDistance / threshold, 1)
  const triggered = pullDistance >= threshold

  return (
    <div
      data-testid={testId}
      className={cn('relative overflow-hidden', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Indicador visual */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          aria-hidden="true"
          className="absolute top-0 left-0 right-0 flex justify-center items-center z-10 pointer-events-none"
          style={{ height: pullDistance, transition: isRefreshing ? 'none' : 'height 100ms ease' }}
        >
          <div
            className={cn(
              'flex items-center justify-center h-8 w-8 rounded-full bg-card border border-border shadow-sm',
              triggered && 'bg-primary text-primary-foreground border-primary'
            )}
          >
            <RefreshCw
              className={cn('h-4 w-4', isRefreshing && 'animate-spin')}
              style={{ transform: `rotate(${progress * 360}deg)`, transition: 'transform 100ms linear' }}
            />
          </div>
        </div>
      )}

      {/* Conteúdo */}
      <div
        ref={containerRef}
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: pullDistance === 0 && !isRefreshing ? 'transform 200ms ease' : 'none',
        }}
        className="overflow-y-auto h-full"
      >
        {children}
      </div>
    </div>
  )
}
