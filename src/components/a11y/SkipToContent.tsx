'use client'
/**
 * SkipToContent — link de acessibilidade para saltar para o conteúdo principal.
 * TASK-14 ST001 (CL-T05)
 *
 * Invisível até receber foco (sr-only + focus:not-sr-only).
 * Requer que o main content tenha id="main" e tabIndex={-1}.
 */

interface SkipToContentProps {
  label?: string
}

export function SkipToContent({ label = 'Ir para o conteúdo principal' }: SkipToContentProps) {
  return (
    <a
      href="#main"
      className={[
        'sr-only',
        'focus:not-sr-only',
        'focus:absolute',
        'focus:top-4',
        'focus:left-4',
        'focus:z-[9999]',
        'focus:px-4',
        'focus:py-2',
        'focus:rounded',
        'focus:bg-primary',
        'focus:text-primary-foreground',
        'focus:font-semibold',
        'focus:shadow-lg',
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-ring',
      ].join(' ')}
    >
      {label}
    </a>
  )
}
