'use client'

import { useCallback } from 'react'
import Image from 'next/image'
import { Trash2, FileImage } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { AssetDownloadMenu } from './AssetDownloadMenu'
import type { VisualAsset } from '@/types/visual-asset'

interface AssetCardProps {
  asset: VisualAsset
  onDelete: (id: string) => void
  onClick: (asset: VisualAsset) => void
  selected?: boolean
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1_048_576).toFixed(1)} MB`
}

function getFileTypeLabel(type: string): string {
  const map: Record<string, string> = {
    'image/png': 'PNG',
    'image/jpeg': 'JPG',
    'image/webp': 'WebP',
    'image/svg+xml': 'SVG',
  }
  return map[type] ?? type
}

export function AssetCard({ asset, onDelete, onClick, selected = false }: AssetCardProps) {
  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onDelete(asset.id)
    },
    [asset.id, onDelete],
  )

  const handleClick = useCallback(() => {
    onClick(asset)
  }, [asset, onClick])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onClick(asset)
      }
    },
    [asset, onClick],
  )

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`Asset: ${asset.originalName}`}
      aria-pressed={selected}
      className={cn(
        'group relative rounded-lg border border-border bg-card overflow-hidden',
        'cursor-pointer transition-[border-color,box-shadow] duration-200',
        'hover:border-foreground/20 hover:shadow-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        selected && 'ring-2 ring-primary border-primary',
      )}
    >
      {/* Thumbnail area */}
      <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden">
        {asset.thumbnailUrl ? (
          <Image
            src={asset.thumbnailUrl}
            alt={asset.altText ?? asset.originalName}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover"
          />
        ) : (
          <FileImage className="h-10 w-10 text-muted-foreground" aria-hidden />
        )}

        {/* Download menu overlay */}
        <div
          className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <AssetDownloadMenu assetId={asset.id} />
        </div>

        {/* Delete button overlay */}
        <button
          onClick={handleDelete}
          aria-label={`Excluir ${asset.originalName}`}
          className={cn(
            'absolute top-2 right-2 z-10',
            'flex items-center justify-center',
            'h-11 w-11 min-h-[44px] min-w-[44px]',
            'rounded-md bg-background/80 backdrop-blur-sm',
            'text-danger opacity-0 group-hover:opacity-100',
            'transition-opacity duration-200',
            'hover:bg-danger hover:text-danger-foreground',
            'focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {/* Info area */}
      <div className="p-3 space-y-1.5">
        <p
          className="text-sm font-medium text-foreground truncate"
          title={asset.originalName}
        >
          {asset.originalName}
        </p>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {formatFileSize(asset.fileSizeBytes)}
          </span>
          <Badge variant="default">
            {getFileTypeLabel(asset.fileType)}
          </Badge>
        </div>
      </div>
    </div>
  )
}
