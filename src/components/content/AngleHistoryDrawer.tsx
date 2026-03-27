'use client'

import { useEffect, useRef, useCallback } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAngleHistory } from '@/hooks/useAngleHistory'
import { VersionItem } from './VersionItem'

interface AngleHistoryDrawerProps {
  open: boolean
  onClose: () => void
  themeId: string
  angleId: string | null
  onRestored?: () => void
}

export function AngleHistoryDrawer({
  open,
  onClose,
  themeId,
  angleId,
  onRestored,
}: AngleHistoryDrawerProps) {
  const { versions, isLoading, error, fetchHistory, restore } = useAngleHistory(themeId)
  const drawerRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Fetch history when opened
  useEffect(() => {
    if (open && angleId) {
      fetchHistory(angleId)
    }
  }, [open, angleId, fetchHistory])

  // Focus trap
  useEffect(() => {
    if (open && closeButtonRef.current) {
      closeButtonRef.current.focus()
    }
  }, [open])

  // Escape to close
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  async function handleRestore(version: number): Promise<boolean> {
    const ok = await restore(version)
    if (ok && onRestored) onRestored()
    return ok
  }

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Histórico de versões"
        onKeyDown={handleKeyDown}
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-full max-w-[420px] bg-background border-l border-border shadow-lg',
          'animate-in slide-in-from-right duration-300'
        )}
        data-testid="angle-history-drawer"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-lg font-semibold text-foreground">Histórico de versões</h2>
          <Button
            ref={closeButtonRef}
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Fechar histórico"
            data-testid="close-history-drawer"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4 space-y-3" style={{ maxHeight: 'calc(100vh - 64px)' }}>
          {isLoading && (
            <div className="space-y-3" data-testid="history-loading">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2 rounded-md border border-border p-3">
                  <Skeleton variant="text" className="w-1/3" />
                  <Skeleton variant="text" />
                  <Skeleton variant="text" className="w-2/3" />
                </div>
              ))}
            </div>
          )}

          {error && (
            <p className="text-sm text-[#991B1B]" data-testid="history-error">{error}</p>
          )}

          {!isLoading && !error && versions.length === 0 && (
            <p className="text-sm text-muted-foreground" data-testid="history-empty">
              Apenas uma versão disponível
            </p>
          )}

          {!isLoading && !error && versions.length > 0 && (
            <div className="space-y-3">
              {versions.map((version) => (
                <VersionItem
                  key={version.id}
                  version={version}
                  onRestore={handleRestore}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
