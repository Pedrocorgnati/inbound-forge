'use client'

// module-9: ImagePreviewPanel — Polling UI + Preview
// Rastreabilidade: TASK-4, G-001, P5, I2, CX-02, FEAT-creative-generation-004
// REMEDIATION M9-G-003: integração do AssetBackgroundPicker (US-asset-003)

import { useState, useCallback } from 'react'
import { ImageIcon, RefreshCw, AlertTriangle, CheckCircle2, Loader2, Sparkles, FileImage } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useImageJobPolling } from '@/hooks/useImageJobPolling'
import { AssetBackgroundPicker } from '@/components/asset-library/AssetBackgroundPicker'
import { TemplateAssetPreview } from '@/components/asset-library/TemplateAssetPreview'
import type { ImageJobStatus } from '@/types/image-worker'
import type { TemplateType } from '@/types/image-template'
import { IMAGE_JOB_STATUS } from '@/constants/status'

interface ImagePreviewPanelProps {
  contentPieceId: string
  templateType?: TemplateType
  onImageGenerated?: (imageUrl: string) => void
}

const STATUS_CONFIG: Record<ImageJobStatus, { label: string; color: string; icon: typeof Loader2 }> = {
  PENDING:     { label: 'Na fila',       color: 'text-muted-foreground', icon: Loader2 },
  PROCESSING:  { label: 'Gerando...',    color: 'text-primary',          icon: Sparkles },
  DONE:        { label: 'Concluído',     color: 'text-success',          icon: CheckCircle2 },
  FAILED:      { label: 'Falha',         color: 'text-danger',           icon: AlertTriangle },
  DEAD_LETTER: { label: 'Erro crítico',  color: 'text-danger',           icon: AlertTriangle },
}

type PanelMode = 'ai' | 'asset'

export function ImagePreviewPanel({ contentPieceId, templateType = 'STATIC_LANDSCAPE', onImageGenerated }: ImagePreviewPanelProps) {
  const { data, isPolling, error, startPolling } = useImageJobPolling()
  const [isRequesting, setIsRequesting] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [mode, setMode] = useState<PanelMode>('ai')
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)

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

  const handleComposeWithAsset = useCallback(async () => {
    if (!selectedAssetId) return
    setIsRequesting(true)
    setRequestError(null)

    try {
      const res = await fetch('/api/image-jobs/with-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentPieceId, assetId: selectedAssetId, templateType }),
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
      setRequestError(err instanceof Error ? err.message : 'Erro ao compor com asset')
    } finally {
      setIsRequesting(false)
    }
  }, [contentPieceId, selectedAssetId, templateType, startPolling])

  const handleRetry = useCallback(async () => {
    if (mode === 'asset' && selectedAssetId) {
      await handleComposeWithAsset()
    } else {
      await handleGenerate()
    }
  }, [mode, selectedAssetId, handleComposeWithAsset, handleGenerate])

  // Notify parent when image is ready
  if (data?.status === IMAGE_JOB_STATUS.DONE && data.imageUrl && onImageGenerated) {
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
        {/* Mode toggle */}
        <div className="flex rounded-md border border-border overflow-hidden" role="tablist" aria-label="Modo de geração">
          <button
            role="tab"
            aria-selected={mode === 'ai'}
            onClick={() => setMode('ai')}
            className={[
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
              mode === 'ai'
                ? 'bg-primary text-primary-foreground'
                : 'bg-transparent text-muted-foreground hover:bg-muted',
            ].join(' ')}
            data-testid="mode-ai-tab"
          >
            <Sparkles className="h-3 w-3" />
            Gerar com IA
          </button>
          <button
            role="tab"
            aria-selected={mode === 'asset'}
            onClick={() => setMode('asset')}
            className={[
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors border-l border-border',
              mode === 'asset'
                ? 'bg-primary text-primary-foreground'
                : 'bg-transparent text-muted-foreground hover:bg-muted',
            ].join(' ')}
            data-testid="mode-asset-tab"
          >
            <FileImage className="h-3 w-3" />
            Usar meu asset
          </button>
        </div>

        {/* Asset mode */}
        {mode === 'asset' && (
          <div className="space-y-3" data-testid="asset-mode-panel">
            <AssetBackgroundPicker
              templateType={templateType}
              selectedAssetId={selectedAssetId}
              onSelect={setSelectedAssetId}
            />

            {selectedAssetId && (
              <TemplateAssetPreview
                templateType={templateType}
                assetId={selectedAssetId}
                className="w-full rounded-md overflow-hidden border"
              />
            )}

            <Button
              onClick={handleComposeWithAsset}
              size="sm"
              className="w-full"
              disabled={!selectedAssetId || isRequesting}
              data-testid="compose-with-asset-btn"
            >
              {isRequesting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileImage className="mr-2 h-4 w-4" />
              )}
              {selectedAssetId ? 'Usar este asset' : 'Selecione um asset acima'}
            </Button>
          </div>
        )}

        {/* AI mode */}
        {mode === 'ai' && (
          <>
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
                  <StatusIcon className={`h-4 w-4 ${data.status === IMAGE_JOB_STATUS.PROCESSING || data.status === IMAGE_JOB_STATUS.PENDING ? 'animate-spin' : ''}`} />
                  <span>{statusConfig?.label}</span>
                  {data.retryCount > 0 && (
                    <span className="text-xs text-muted-foreground">(tentativa {data.retryCount + 1})</span>
                  )}
                </div>

                {/* Image preview */}
                {data.status === IMAGE_JOB_STATUS.DONE && data.imageUrl && (
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
                {(data.status === IMAGE_JOB_STATUS.FAILED || data.status === IMAGE_JOB_STATUS.DEAD_LETTER) && (
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
                {data.status === IMAGE_JOB_STATUS.DONE && (
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
          </>
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
