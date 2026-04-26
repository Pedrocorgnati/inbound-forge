import { cn } from '@/lib/utils'

interface StickyActionBarProps {
  children: React.ReactNode
  className?: string
  /** Ocultar em desktop (padrão: true — exibir apenas em mobile) */
  mobileOnly?: boolean
  'data-testid'?: string
}

/**
 * StickyActionBar — barra de ações fixada na parte inferior da tela em mobile.
 * Segue MOBILE-GUIDE §3.5: safe-area-inset-bottom, z-index controlado, backdrop blur.
 */
export function StickyActionBar({
  children,
  className,
  mobileOnly = true,
  'data-testid': testId = 'sticky-action-bar',
}: StickyActionBarProps) {
  return (
    <div
      data-testid={testId}
      className={cn(
        'fixed bottom-0 left-0 right-0 z-30',
        'border-t border-border bg-card/95 backdrop-blur-sm',
        'px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]',
        'flex items-center gap-3',
        mobileOnly && 'md:hidden',
        className
      )}
    >
      {children}
    </div>
  )
}
