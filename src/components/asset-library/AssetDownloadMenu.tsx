'use client'

/**
 * TASK-7/ST002 (CL-193) — Menu de download de asset (PNG/WebP).
 */
import { useEffect, useRef, useState } from 'react'
import { Download } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

interface Props {
  assetId: string
  className?: string
}

export function AssetDownloadMenu({ assetId, className }: Props) {
  const t = useTranslations('assetDownload')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  return (
    <div ref={ref} className={cn('relative inline-block', className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('label')}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className="flex h-8 w-8 items-center justify-center rounded-md bg-background/80 hover:bg-background"
      >
        <Download className="h-4 w-4" aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-44 rounded border border-border bg-background shadow-md"
          onClick={(e) => e.stopPropagation()}
        >
          <a
            role="menuitem"
            href={`/api/v1/assets/${assetId}/download?format=png`}
            download
            className="block px-3 py-2 text-sm hover:bg-muted"
            onClick={() => setOpen(false)}
          >
            {t('png')}
          </a>
          <a
            role="menuitem"
            href={`/api/v1/assets/${assetId}/download?format=webp`}
            download
            className="block px-3 py-2 text-sm hover:bg-muted"
            onClick={() => setOpen(false)}
          >
            {t('webp')}
          </a>
        </div>
      )}
    </div>
  )
}
