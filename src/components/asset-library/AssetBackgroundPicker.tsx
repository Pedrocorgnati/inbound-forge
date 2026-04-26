'use client'

// module-10: AssetBackgroundPicker — mini-galeria com filtro aspect ratio
// Rastreabilidade: TASK-5 ST002, TASK-2 ST002, INT-063, GAP-007
// Blueprint: ai-forge/blueprints/image-gallery.md

import { useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Check, FileImage, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import type { VisualAsset } from '@/types/visual-asset'
import type { TemplateType } from '@/types/image-template'
import { useAssetPicker } from '@/hooks/useAssetPicker'
import { ROUTES } from '@/constants/routes'

// ─── Constants ──────────────────────────────────────────────────────────────────

const MINI_GALLERY_COUNT = 4

// ─── Props ──────────────────────────────────────────────────────────────────────

interface AssetBackgroundPickerProps {
  templateType: TemplateType
  selectedAssetId: string | null
  onSelect: (assetId: string) => void
}

// ─── Mini Card ──────────────────────────────────────────────────────────────────

function MiniAssetCard({
  asset,
  isSelected,
  onSelect,
}: {
  asset: VisualAsset
  isSelected: boolean
  onSelect: (id: string) => void
}) {
  const handleClick = useCallback(() => {
    onSelect(asset.id)
  }, [asset.id, onSelect])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onSelect(asset.id)
      }
    },
    [asset.id, onSelect]
  )

  return (
    <div
      role="radio"
      tabIndex={0}
      aria-checked={isSelected}
      aria-label={`Asset: ${asset.altText ?? asset.originalName}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative aspect-square rounded-lg border border-border bg-muted overflow-hidden',
        'cursor-pointer transition-[border-color,box-shadow] duration-200',
        'min-h-[44px] min-w-[44px]',
        'hover:border-foreground/20',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isSelected && 'ring-2 ring-primary border-primary',
      )}
    >
      {asset.thumbnailUrl ? (
        <Image
          src={asset.thumbnailUrl}
          alt={asset.altText ?? asset.originalName}
          fill
          sizes="100px"
          className="object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <FileImage className="h-6 w-6 text-muted-foreground" aria-hidden />
        </div>
      )}

      {/* Check overlay when selected */}
      {isSelected && (
        <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
            <Check className="h-4 w-4 text-primary-foreground" aria-hidden />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Component ──────────────────────────────────────────────────────────────────

export function AssetBackgroundPicker({
  templateType,
  selectedAssetId,
  onSelect,
}: AssetBackgroundPickerProps) {
  const { assets, isLoading } = useAssetPicker(templateType)
  const displayAssets = assets.slice(0, MINI_GALLERY_COUNT)

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-3" role="status" aria-label="Carregando assets...">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {Array.from({ length: MINI_GALLERY_COUNT }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
        <span className="sr-only">Carregando assets compatíveis...</span>
      </div>
    )
  }

  // Empty state
  if (displayAssets.length === 0) {
    return (
      <EmptyState
        icon={<FileImage className="h-12 w-12" />}
        title="Nenhum asset compatível"
        description="Não há assets com proporção compatível com este template."
        ctaLabel="Ir para Biblioteca"
        onCtaClick={() => window.open('/assets', '_blank', 'noopener,noreferrer')}
      />
    )
  }

  return (
    <div className="space-y-3" role="radiogroup" aria-label="Selecionar asset de fundo">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {displayAssets.map((asset) => (
          <MiniAssetCard
            key={asset.id}
            asset={asset}
            isSelected={selectedAssetId === asset.id}
            onSelect={onSelect}
          />
        ))}
      </div>

      {assets.length > MINI_GALLERY_COUNT && (
        <Link
          href={ROUTES.ASSETS}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'inline-flex items-center gap-1.5 text-sm text-primary',
            'hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          Ver todos ({assets.length} assets)
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </Link>
      )}
    </div>
  )
}
