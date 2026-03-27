'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { FileImage } from 'lucide-react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { VisualAsset } from '@/types/visual-asset'

interface AssetPreviewModalProps {
  asset: VisualAsset | null
  open: boolean
  onClose: () => void
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

export function AssetPreviewModal({ asset, open, onClose }: AssetPreviewModalProps) {
  const [altText, setAltText] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync local altText when asset changes
  useEffect(() => {
    if (asset) {
      setAltText(asset.altText ?? '')
    }
  }, [asset])

  const saveAltText = useCallback(
    async (value: string) => {
      if (!asset) return

      setIsSaving(true)
      try {
        const res = await fetch(`/api/visual-assets/${asset.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ altText: value }),
        })

        if (!res.ok) {
          throw new Error('Falha ao salvar texto alternativo')
        }

        toast.success('Texto alternativo salvo')
      } catch {
        toast.error('Erro ao salvar texto alternativo')
      } finally {
        setIsSaving(false)
      }
    },
    [asset],
  )

  const handleAltTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setAltText(value)

      // Debounce auto-save
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      debounceRef.current = setTimeout(() => {
        saveAltText(value)
      }, 800)
    },
    [saveAltText],
  )

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  if (!asset) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={asset.originalName}
      description="Visualização e edição do asset"
      size="lg"
    >
      <div className="space-y-4">
        {/* Image preview */}
        <div className="relative w-full aspect-video bg-muted rounded-md overflow-hidden flex items-center justify-center">
          {asset.storageUrl ? (
            <Image
              src={asset.storageUrl}
              alt={asset.altText ?? asset.originalName}
              fill
              sizes="640px"
              className="object-contain"
              priority
            />
          ) : (
            <FileImage className="h-16 w-16 text-muted-foreground" aria-hidden />
          )}
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default">
            {getFileTypeLabel(asset.fileType)}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {formatFileSize(asset.fileSizeBytes)}
          </span>
          {asset.widthPx != null && asset.heightPx != null && (
            <span className="text-sm text-muted-foreground">
              {asset.widthPx} × {asset.heightPx}px
            </span>
          )}
        </div>

        {/* Alt text editor */}
        <Input
          label="Texto alternativo"
          value={altText}
          onChange={handleAltTextChange}
          placeholder="Descreva a imagem para acessibilidade..."
          helperText={isSaving ? 'Salvando...' : 'Salva automaticamente'}
        />
      </div>
    </Modal>
  )
}
