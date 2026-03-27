'use client'

// module-10: TemplateAssetPreview — preview em tempo real de template + asset
// Rastreabilidade: TASK-5 ST003, TASK-2 ST003, INT-063, GAP-008
// Cache: sessionStorage por (templateType, assetId)
// Debounce: 500ms nas mudanças de props

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { AlertCircle, RefreshCw, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { TemplateType } from '@/types/image-template'

// ─── Constants ──────────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 500
const CACHE_PREFIX = 'template-asset-preview:'

// ─── Cache Helpers ──────────────────────────────────────────────────────────────

function getCacheKey(templateType: TemplateType, assetId: string): string {
  return `${CACHE_PREFIX}${templateType}:${assetId}`
}

function getCachedPreview(templateType: TemplateType, assetId: string): string | null {
  try {
    return sessionStorage.getItem(getCacheKey(templateType, assetId))
  } catch {
    return null
  }
}

function setCachedPreview(templateType: TemplateType, assetId: string, dataUrl: string): void {
  try {
    sessionStorage.setItem(getCacheKey(templateType, assetId), dataUrl)
  } catch {
    // sessionStorage full — non-critical
  }
}

// ─── Props ──────────────────────────────────────────────────────────────────────

interface TemplateAssetPreviewProps {
  templateType:  TemplateType
  assetId:       string | null
  templateProps?: Record<string, unknown>
  className?:    string
}

// ─── Component ──────────────────────────────────────────────────────────────────

export function TemplateAssetPreview({
  templateType,
  assetId,
  templateProps = {},
  className,
}: TemplateAssetPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading]   = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const debounceRef                 = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef                    = useRef<AbortController | null>(null)

  const fetchPreview = useCallback(
    (tType: TemplateType, aId: string, props: Record<string, unknown>) => {
      // Check cache first
      const cached = getCachedPreview(tType, aId)
      if (cached) {
        setPreviewUrl(cached)
        setIsLoading(false)
        setError(null)
        return
      }

      // Cancel previous request
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setIsLoading(true)
      setError(null)

      fetch('/api/preview/template-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateType: tType,
          assetId: aId,
          templateProps: props,
        }),
        signal: controller.signal,
      })
        .then((res) => {
          if (!res.ok) throw new Error('Falha ao gerar preview')
          return res.blob()
        })
        .then((blob) => {
          const url = URL.createObjectURL(blob)
          setPreviewUrl(url)
          setIsLoading(false)

          // Convert to data URL for cache
          const reader = new FileReader()
          reader.onloadend = () => {
            if (typeof reader.result === 'string') {
              setCachedPreview(tType, aId, reader.result)
            }
          }
          reader.readAsDataURL(blob)
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === 'AbortError') return
          setError('Falha ao gerar preview')
          setIsLoading(false)
        })
    },
    []
  )

  // Debounced effect
  useEffect(() => {
    if (!assetId) {
      setPreviewUrl(null)
      setError(null)
      setIsLoading(false)
      return
    }

    // Check cache immediately (no debounce for cache hits)
    const cached = getCachedPreview(templateType, assetId)
    if (cached) {
      setPreviewUrl(cached)
      setError(null)
      setIsLoading(false)
      return
    }

    // Show loading but keep previous preview visible during debounce
    setIsLoading(true)
    setError(null)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      fetchPreview(templateType, assetId, templateProps)
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [templateType, assetId, templateProps, fetchPreview])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const handleRetry = useCallback(() => {
    if (assetId) {
      fetchPreview(templateType, assetId, templateProps)
    }
  }, [templateType, assetId, templateProps, fetchPreview])

  // No asset selected
  if (!assetId) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/50 p-6',
          'aspect-video',
          className,
        )}
        aria-label="Nenhum asset selecionado"
      >
        <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" aria-hidden />
        <p className="text-sm text-muted-foreground">Selecione um asset para ver o preview</p>
      </div>
    )
  }

  // Error state
  if (error && !previewUrl) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 p-6',
          'aspect-video',
          className,
        )}
        role="alert"
      >
        <AlertCircle className="h-8 w-8 text-destructive mb-2" aria-hidden />
        <p className="text-sm text-destructive mb-3">{error}</p>
        <Button variant="outline" size="sm" onClick={handleRetry}>
          <RefreshCw className="h-4 w-4 mr-1.5" aria-hidden />
          Tentar novamente
        </Button>
      </div>
    )
  }

  // Loading state (show previous preview underneath if available)
  if (isLoading && !previewUrl) {
    return (
      <div
        className={cn('relative aspect-video rounded-lg overflow-hidden', className)}
        role="status"
        aria-label="Gerando preview..."
      >
        <Skeleton className="h-full w-full" />
        <span className="sr-only">Gerando preview do template...</span>
      </div>
    )
  }

  return (
    <div
      className={cn('relative aspect-video rounded-lg overflow-hidden border border-border', className)}
      aria-label={`Preview do template ${templateType} com asset selecionado`}
    >
      {previewUrl && (
        <Image
          src={previewUrl}
          alt="Preview do template"
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className={cn('object-contain', isLoading && 'opacity-50')}
          unoptimized
        />
      )}

      {/* Loading overlay on top of existing preview */}
      {isLoading && previewUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/30">
          <div className="flex items-center gap-2 rounded-md bg-background/80 px-3 py-1.5 text-sm text-muted-foreground backdrop-blur-sm">
            <RefreshCw className="h-4 w-4 animate-spin" aria-hidden />
            Atualizando...
          </div>
        </div>
      )}

      {/* Error banner on top of stale preview */}
      {error && previewUrl && (
        <div className="absolute bottom-0 inset-x-0 flex items-center justify-between bg-destructive/90 px-3 py-2 text-sm text-destructive-foreground">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={handleRetry} className="text-destructive-foreground hover:text-destructive-foreground/80">
            Retry
          </Button>
        </div>
      )}
    </div>
  )
}
