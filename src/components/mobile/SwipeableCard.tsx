'use client'

import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface SwipeAction {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  variant?: 'danger' | 'primary' | 'default'
}

interface SwipeableCardProps {
  children: React.ReactNode
  leftActions?: SwipeAction[]
  rightActions?: SwipeAction[]
  className?: string
  'data-testid'?: string
}

const SWIPE_THRESHOLD = 60
const MAX_SWIPE = 120

const variantClass: Record<string, string> = {
  danger: 'bg-destructive text-destructive-foreground',
  primary: 'bg-primary text-primary-foreground',
  default: 'bg-muted text-muted-foreground',
}

/**
 * SwipeableCard — card com ações reveladas por swipe horizontal (mobile).
 * MOBILE-GUIDE §3.6: touch-action manipulation, snap-back, threshold 60px.
 */
export function SwipeableCard({
  children,
  leftActions = [],
  rightActions = [],
  className,
  'data-testid': testId = 'swipeable-card',
}: SwipeableCardProps) {
  const [offsetX, setOffsetX] = useState(0)
  const startX = useRef<number | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  function handleTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (startX.current === null) return
    const delta = e.touches[0].clientX - startX.current
    const clamped = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, delta))
    // Only allow swipe if there are actions in that direction
    if (clamped > 0 && leftActions.length === 0) return
    if (clamped < 0 && rightActions.length === 0) return
    setOffsetX(clamped)
  }

  function handleTouchEnd() {
    if (Math.abs(offsetX) < SWIPE_THRESHOLD) {
      setOffsetX(0) // snap back
    }
    startX.current = null
  }

  const showLeft = offsetX > SWIPE_THRESHOLD
  const showRight = offsetX < -SWIPE_THRESHOLD

  return (
    <div
      data-testid={testId}
      className={cn('relative overflow-hidden rounded-lg', className)}
      style={{ touchAction: 'pan-y' }}
    >
      {/* Left actions */}
      {leftActions.length > 0 && (
        <div className="absolute inset-y-0 left-0 flex">
          {leftActions.map((action, i) => (
            <button
              key={i}
              onClick={() => { action.onClick(); setOffsetX(0) }}
              aria-label={action.label}
              className={cn(
                'flex flex-col items-center justify-center w-16 gap-1 text-xs font-medium transition-opacity',
                variantClass[action.variant ?? 'default'],
                showLeft ? 'opacity-100' : 'opacity-0'
              )}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Right actions */}
      {rightActions.length > 0 && (
        <div className="absolute inset-y-0 right-0 flex">
          {rightActions.map((action, i) => (
            <button
              key={i}
              onClick={() => { action.onClick(); setOffsetX(0) }}
              aria-label={action.label}
              className={cn(
                'flex flex-col items-center justify-center w-16 gap-1 text-xs font-medium transition-opacity',
                variantClass[action.variant ?? 'default'],
                showRight ? 'opacity-100' : 'opacity-0'
              )}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Card content */}
      <div
        ref={cardRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ transform: `translateX(${offsetX}px)`, transition: startX.current ? 'none' : 'transform 200ms ease' }}
        className="relative bg-card z-10"
      >
        {children}
      </div>
    </div>
  )
}
