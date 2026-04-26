'use client'

import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useFormatters } from '@/lib/i18n/formatters'
import type { AngleVersion } from '@/hooks/useAngleHistory'

interface VersionItemProps {
  version: AngleVersion
  onRestore: (version: number) => Promise<boolean>
}

export function VersionItem({ version, onRestore }: VersionItemProps) {
  const fmt = useFormatters()
  const [isRestoring, setIsRestoring] = useState(false)
  const [confirmRestore, setConfirmRestore] = useState(false)

  const previewText = version.text.length > 80
    ? version.text.slice(0, 80) + '...'
    : version.text

  async function handleRestore() {
    if (!confirmRestore) {
      setConfirmRestore(true)
      return
    }
    setIsRestoring(true)
    try {
      await onRestore(version.version)
    } finally {
      setIsRestoring(false)
      setConfirmRestore(false)
    }
  }

  return (
    <div
      className="flex flex-col gap-2 rounded-md border border-border p-3"
      data-testid={`version-item-${version.version}`}
    >
      <div className="flex items-center gap-2">
        <Badge variant="default">v{version.version}</Badge>
        {version.isCurrent && (
          <Badge variant="success" data-testid="current-version-badge">Atual</Badge>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {fmt.dateTime(version.createdAt)}
        </span>
      </div>

      <p className="text-sm text-muted-foreground">{previewText}</p>

      {!version.isCurrent && (
        <div className="flex items-center gap-2">
          {confirmRestore ? (
            <>
              <span className="text-xs text-[#92400E]">Tem certeza?</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRestore}
                isLoading={isRestoring}
                loadingText="Restaurando..."
                data-testid={`confirm-restore-${version.version}`}
              >
                Confirmar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmRestore(false)}
                data-testid={`cancel-restore-${version.version}`}
              >
                Cancelar
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRestore}
              data-testid={`restore-btn-${version.version}`}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
