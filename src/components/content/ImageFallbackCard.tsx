'use client'

/**
 * ImageFallbackCard — Inbound Forge
 * TASK-4 ST002 / intake-review Sad Paths UI
 *
 * Overlay informativo quando arte usa template estático sem IA (CL-128).
 * Exibido como badge/overlay quando ImageJob.isDegraded=true.
 */
import { ImageOff } from 'lucide-react'

interface ImageFallbackCardProps {
  reason?: string
  onRegenerate?: () => void
  isRegenerating?: boolean
}

export function ImageFallbackCard({ reason, onRegenerate, isRegenerating }: ImageFallbackCardProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-black/40 backdrop-blur-sm text-white text-center p-4">
      <ImageOff className="h-8 w-8 mb-2 text-yellow-300" aria-hidden />
      <p className="text-sm font-semibold">Arte gerada com template básico</p>
      <p className="text-xs text-white/80 mt-1 max-w-xs">
        {reason ?? 'Background IA indisponível no momento.'}
      </p>
      {onRegenerate && (
        <button
          onClick={onRegenerate}
          disabled={isRegenerating}
          className="mt-3 rounded-md bg-yellow-400 px-3 py-1.5 text-xs font-semibold text-yellow-900 hover:bg-yellow-300 disabled:opacity-50 transition-colors"
        >
          {isRegenerating ? 'Regenerando...' : 'Regenerar arte'}
        </button>
      )}
    </div>
  )
}
