'use client'

// module-9: ImagePreviewPanel — Polling UI + Preview
// Rastreabilidade: TASK-4, G-001, P5, I2, CX-02, FEAT-creative-generation-004

import { useState, useCallback } from 'react'
import { ImageIcon, RefreshCw, AlertTriangle, CheckCircle2, Loader2, Sparkles } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useImageJobPolling } from '@/hooks/useImageJobPolling'
import type { ImageJobStatus } from '@/types/image-worker'

interface ImagePreviewPanelProps {
  contentPieceId: string
  onImageGenerated?: (imageUrl: string) => void
}

const STATUS_CONFIG: Record<ImageJobStatus, { label: string; color: string; icon: typeof Loader2 }> = {
  PENDING:     { label: 'Na fila',       color: 'text-muted-foreground', icon: Loader2 },
  PROCESSING:  { label: 'Gerando...',    color: 'text-primary',          icon: Sparkles },
  DONE:        { label: 'Concluído',     color: 'text-success',          icon: CheckCircle2 },
  FAILED:      { label: 'Falha',         color: 'text-danger',           icon: AlertTriangle },
  DEAD_LETTER: { label: 'Erro crítico',  color: 'text-danger',           icon: AlertTriangle },
}

export function ImagePreviewPanel({ contentPieceId, onImageGenerated }: ImagePreviewPanelProps) {
  const { data, isPolling, error, startPolling } = useImageJobPolling()
  const [isRequesting, setIsRequesting] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)

  const handleGenerate = useCallback(async () => {
    setIsRequesting(true)
    setRequestError(null)

    try {
      const res = await fetch('/api/image-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentPieceId,
          prompt: 'Gerar imagem para conteúdo aprovado',
        }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => null)
        throw new Error(json?.error?.message ?? `HTTP ${res.status}`)
      }

      const json = await res.json()
      const jobId = json.data?.jobId ?? json.jobId
      if (jobId) {
        startPolling(jobId)
      }
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : 'Erro ao solicitar geração')
    } finally {
      setIsRequesting(false)
    }
  }, [contentPieceId, startPolling])

  const handleRetry = useCallback(async () => {
    await handleGenerate()
  }, [handleGenerate])

  // Notify parent when image is ready
  if (data?.status === 'DONE' && data.imageUrl && onImageGenerated) {
    onImageGenerated(data.imageUrl)
  }

  const statusConfig = data ? STATUS_CONFIG[data.status] : null
  const StatusIcon = statusConfig?.icon ?? ImageIcon

  return (
    <Card data-testid="image-preview-panel">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <ImageIcon className="h-4 w-4" />
          Arte Visual
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* No job yet */}
        {!data && !isPolling && !isRequesting && (
          <div className="space-y-3">
            <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-muted-foreground/25">
              <p className="text-xs text-muted-foreground">Nenhuma imagem gerada</p>
            </div>
            <Button
              onClick={handleGenerate}
              size="sm"
              className="w-full"
              data-testid="generate-image-btn"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Gerar imagem
            </Button>
          </div>
        )}

        {/* Requesting */}
        {isRequesting && (
          <div className="flex h-32 items-center justify-center rounded-md border border-dashed">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Polling status */}
        {data && (
          <div className="space-y-3">
            {/* Status badge */}
            <div className={`flex items-center gap-2 text-sm ${statusConfig?.color ?? ''}`}>
              <StatusIcon className={`h-4 w-4 ${data.status === 'PROCESSING' || data.status === 'PENDING' ? 'animate-spin' : ''}`} />
              <span>{statusConfig?.label}</span>
              {data.retryCount > 0 && (
                <span className="text-xs text-muted-foreground">(tentativa {data.retryCount + 1})</span>
              )}
            </div>

            {/* Image preview */}
            {data.status === 'DONE' && data.imageUrl && (
              <div className="relative aspect-square w-full overflow-hidden rounded-md border" data-testid="image-preview">
                <Image
                  src={data.imageUrl}
                  alt="Imagem gerada"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
            )}

            {/* Error state */}
            {(data.status === 'FAILED' || data.status === 'DEAD_LETTER') && (
              <div className="space-y-2">
                {data.errorMessage && (
                  <p className="text-xs text-muted-foreground">{data.errorMessage}</p>
                )}
                <Button
                  onClick={handleRetry}
                  size="sm"
                  variant="outline"
                  className="w-full"
                  data-testid="retry-image-btn"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Tentar novamente
                </Button>
              </div>
            )}

            {/* Regenerate for completed images */}
            {data.status === 'DONE' && (
              <Button
                onClick={handleRetry}
                size="sm"
                variant="outline"
                className="w-full"
                data-testid="regenerate-image-btn"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Gerar nova versão
              </Button>
            )}
          </div>
        )}

        {/* Errors */}
        {(error || requestError) && (
          <p className="text-xs text-danger" data-testid="image-error">
            {error ?? requestError}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
