'use client'

// AssetLightbox — modal fullscreen com prev/next e ESC close
// Intake-Review TASK-18 ST001 (CL-CG-040).

import { useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'

type Asset = {
  id: string
  fileName: string
  originalName?: string | null
  storageUrl: string
  fileType?: string | null
  tags?: string[]
  uploadedBy?: string | null
  widthPx?: number | null
  heightPx?: number | null
  fileSizeBytes?: number | null
}

type Props = {
  open: boolean
  onClose: () => void
  assets: Asset[]
  activeIndex: number
  onIndexChange: (i: number) => void
}

export function AssetLightbox({ open, onClose, assets, activeIndex, onIndexChange }: Props) {
  const prev = useCallback(
    () => onIndexChange((activeIndex - 1 + assets.length) % assets.length),
    [activeIndex, assets.length, onIndexChange],
  )
  const next = useCallback(
    () => onIndexChange((activeIndex + 1) % assets.length),
    [activeIndex, assets.length, onIndexChange],
  )

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, prev, next])

  if (!open || assets.length === 0 || typeof window === 'undefined') return null
  const a = assets[activeIndex]
  if (!a) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${a.originalName ?? a.fileName}`}
      data-testid="asset-lightbox"
      className="fixed inset-0 z-[100] flex flex-col bg-black/95"
      onClick={onClose}
    >
      <header className="flex items-center justify-between border-b border-white/10 p-3 text-xs text-white/80">
        <span>
          {activeIndex + 1} / {assets.length} — {a.originalName ?? a.fileName}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="rounded border border-white/20 px-3 py-1 text-xs hover:bg-white/10"
          aria-label="Fechar"
        >
          Fechar (Esc)
        </button>
      </header>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {assets.length > 1 && (
          <button
            type="button"
            onClick={prev}
            aria-label="Anterior"
            className="absolute left-4 rounded-full border border-white/20 bg-black/40 px-4 py-2 text-xl text-white hover:bg-white/10"
          >
            ‹
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={a.storageUrl}
          alt={a.originalName ?? a.fileName}
          className="max-h-full max-w-full object-contain"
        />
        {assets.length > 1 && (
          <button
            type="button"
            onClick={next}
            aria-label="Proximo"
            className="absolute right-4 rounded-full border border-white/20 bg-black/40 px-4 py-2 text-xl text-white hover:bg-white/10"
          >
            ›
          </button>
        )}
      </div>

      <footer
        className="grid grid-cols-2 gap-3 border-t border-white/10 p-3 text-xs text-white/70 sm:grid-cols-4"
        onClick={(e) => e.stopPropagation()}
      >
        <Meta label="Tipo" value={a.fileType ?? '—'} />
        <Meta label="Tamanho" value={a.fileSizeBytes ? formatBytes(a.fileSizeBytes) : '—'} />
        <Meta
          label="Dimensoes"
          value={a.widthPx && a.heightPx ? `${a.widthPx}x${a.heightPx}` : '—'}
        />
        <Meta label="Tags" value={a.tags?.length ? a.tags.join(', ') : '—'} />
      </footer>
    </div>,
    document.body,
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="uppercase tracking-wide text-white/40">{label}</dt>
      <dd className="mt-0.5 break-words">{value}</dd>
    </div>
  )
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}
