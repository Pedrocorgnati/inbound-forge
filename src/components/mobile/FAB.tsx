'use client'

import { cn } from '@/lib/utils'

interface FABProps {
  onClick: () => void
  icon: React.ReactNode
  label: string
  className?: string
  'data-testid'?: string
}

/**
 * FAB — Floating Action Button para ação principal em mobile.
 * MOBILE-GUIDE §3.4: 56×56px touch target, safe-area-inset-bottom, z-index 30.
 */
export function FAB({
  onClick,
  icon,
  label,
  className,
  'data-testid': testId = 'fab',
}: FABProps) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      aria-label={label}
      className={cn(
        'fixed right-4 z-30 md:hidden',
        'bottom-[calc(1rem+env(safe-area-inset-bottom))]',
        'flex h-14 w-14 items-center justify-center',
        'rounded-full bg-primary text-primary-foreground shadow-lg',
        'hover:bg-primary/90 active:scale-95 transition-transform',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        className
      )}
    >
      {icon}
      <span className="sr-only">{label}</span>
    </button>
  )
}
