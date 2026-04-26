'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
  'data-testid'?: string
}

/**
 * BottomSheet — drawer mobile que desliza de baixo para cima.
 * MOBILE-GUIDE §3.3: overlay + handle + slide-up + close-on-backdrop.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
  className,
  'data-testid': testId = 'bottom-sheet',
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)

  // Fechar com Escape + focus trap
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'Tab' && sheetRef.current) {
        const focusable = sheetRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input, select, textarea'
        )
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last?.focus() }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first?.focus() }
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    // Bloquear scroll do body
    document.body.style.overflow = 'hidden'
    // Focar no sheet ao abrir
    sheetRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        data-testid={`${testId}-backdrop`}
        className="fixed inset-0 bg-black/50 z-50 md:hidden"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        data-testid={testId}
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 md:hidden',
          'bg-card rounded-t-2xl border-t border-border',
          'pb-[env(safe-area-inset-bottom)]',
          'animate-in slide-in-from-bottom duration-200',
          'max-h-[85dvh] flex flex-col',
          'focus:outline-none',
          className
        )}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div
            data-testid={`${testId}-handle`}
            className="w-10 h-1 rounded-full bg-muted-foreground/30"
            aria-hidden="true"
          />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            <button
              data-testid={`${testId}-close`}
              onClick={onClose}
              aria-label="Fechar"
              className="flex items-center justify-center h-9 w-9 rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {children}
        </div>
      </div>
    </>
  )
}
