'use client'

// ArtPreview — Preview em tempo real da arte visual com debounce
// Rastreabilidade: CL-082, TASK-4 ST002

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Loader2, ImageIcon } from 'lucide-react'
import { ImageFallbackCard } from '@/components/content/ImageFallbackCard'

interface ArtPreviewProps {
  template?: string
  headline?: string
  backgroundUrl?: string
  dimensions?: { width: number; height: number }
  className?: string
  /** TASK-4 ST002: true quando arte usa template estático (IA indisponível) */
  isDegraded?: boolean
  /** Motivo da degradação para exibição ao operador */
  degradedReason?: string
  /** Callback para regenerar arte quando IA voltar */
  onRegenerate?: () => void
  isRegenerating?: boolean
}

const DEBOUNCE_MS = 300

function buildPreviewUrl(params: {
  template?: string
  headline?: string
  backgroundUrl?: string
  width: number
  height: number
}): string {
  const sp = new URLSearchParams()
  if (params.template) sp.set('template', params.template)
  if (params.headline) sp.set('headline', params.headline)
  if (params.backgroundUrl) sp.set('backgroundUrl', params.backgroundUrl)
  sp.set('width', String(params.width))
  sp.set('height', String(params.height))
  return `/api/v1/images/preview?${sp.toString()}`
}

export function ArtPreview({
  template,
  headline,
  backgroundUrl,
  dimensions = { width: 1200, height: 630 },
  className,
  isDegraded,
  degradedReason,
  onRegenerate,
  isRegenerating,
}: ArtPreviewProps) {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    setIsLoading(true)
    setError(null)

    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort()
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const url = buildPreviewUrl({
          template,
          headline,
          backgroundUrl,
          width: dimensions.width,
          height: dimensions.height,
        })

        const res = await fetch(url, { signal: controller.signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const blob = await res.blob()
        const objectUrl = URL.createObjectURL(blob)
        setPreviewSrc((prev) => {
          if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
          return objectUrl
        })
        setError(null)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        setError('Não foi possível gerar o preview.')
      } finally {
        setIsLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [template, headline, backgroundUrl, dimensions.width, dimensions.height])

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (previewSrc?.startsWith('blob:')) URL.revokeObjectURL(previewSrc)
      if (abortRef.current) abortRef.current.abort()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const aspectRatio = dimensions.width / dimensions.height

  return (
    <div
      data-testid="art-preview"
      className={`relative overflow-hidden rounded-lg border border-border bg-muted/30 ${className ?? ''}`}
      style={{ aspectRatio: String(aspectRatio) }}
    >
      {/* Loading overlay */}
      {isLoading && (
        <div
          data-testid="preview-loading"
          className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm"
        >
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Preview image */}
      {previewSrc && !error && (
        <Image
          src={previewSrc}
          alt="Preview da arte"
          fill
          className="object-cover"
          sizes={`${dimensions.width}px`}
          priority={false}
          unoptimized // preview é blob temporario
        />
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
          <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
      )}

      {/* Empty state (sem src ainda) */}
      {!previewSrc && !isLoading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
          <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground">Preview da arte</p>
        </div>
      )}

      {/* TASK-4 ST002: overlay de degradação quando IA indisponível (CL-128) */}
      {isDegraded && !isLoading && (
        <ImageFallbackCard
          reason={degradedReason}
          onRegenerate={onRegenerate}
          isRegenerating={isRegenerating}
        />
      )}

      {/* Dimensões */}
      <div className="absolute bottom-1 right-1 rounded bg-background/70 px-1.5 py-0.5 text-[10px] text-muted-foreground">
        {dimensions.width}×{dimensions.height}
      </div>
    </div>
  )
}
