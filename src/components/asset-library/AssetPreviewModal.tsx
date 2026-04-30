'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { FileImage, X, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { ResponsiveSheet } from '@/components/ui/responsive-sheet'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

const MAX_TAGS = 20
const MAX_TAG_LEN = 50

export function AssetPreviewModal({ asset, open, onClose }: AssetPreviewModalProps) {
  const [altText, setAltText]     = useState('')
  const [isSaving, setIsSaving]   = useState(false)
  const [tags, setTags]           = useState<string[]>([])
  const [tagInput, setTagInput]   = useState('')
  const [isSavingTag, setSavingTag] = useState(false)
  const debounceRef               = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (asset) {
      setAltText(asset.altText ?? '')
      setTags(asset.tags ?? [])
    }
  }, [asset])

  // ── Alt Text ──────────────────────────────────────────────────────────────

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
        if (!res.ok) throw new Error('Falha ao salvar texto alternativo')
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
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => saveAltText(value), 800)
    },
    [saveAltText],
  )

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // ── Tags ──────────────────────────────────────────────────────────────────

  const persistTags = useCallback(
    async (nextTags: string[]) => {
      if (!asset) return
      setSavingTag(true)
      try {
        const res = await fetch(`/api/visual-assets/${asset.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags: nextTags }),
        })
        if (!res.ok) throw new Error('Falha ao salvar tags')
      } catch {
        toast.error('Erro ao salvar tags')
      } finally {
        setSavingTag(false)
      }
    },
    [asset],
  )

  const commitTagInput = useCallback(
    (raw: string) => {
      const tag = raw.trim().toLowerCase().replace(/,+$/, '')
      if (!tag) return
      if (tag.length > MAX_TAG_LEN) {
        toast.error(`Tag muito longa (máx. ${MAX_TAG_LEN} caracteres)`)
        return
      }
      if (tags.includes(tag)) {
        setTagInput('')
        return
      }
      if (tags.length >= MAX_TAGS) {
        toast.error(`Máximo de ${MAX_TAGS} tags atingido`)
        return
      }
      const nextTags = [...tags, tag]
      setTags(nextTags)
      setTagInput('')
      persistTags(nextTags)
    },
    [tags, persistTags],
  )

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault()
        commitTagInput(tagInput)
      }
      if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
        const nextTags = tags.slice(0, -1)
        setTags(nextTags)
        persistTags(nextTags)
      }
    },
    [tagInput, tags, commitTagInput, persistTags],
  )

  const handleRemoveTag = useCallback(
    (tag: string) => {
      const nextTags = tags.filter((t) => t !== tag)
      setTags(nextTags)
      persistTags(nextTags)
    },
    [tags, persistTags],
  )

  if (!asset) return null

  return (
    <ResponsiveSheet
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
              sizes="(max-width: 640px) 100vw, 640px"
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

        {/* Tag manager */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Etiquetas
            {isSavingTag && (
              <span className="ml-2 text-xs text-muted-foreground font-normal">Salvando...</span>
            )}
          </label>

          {/* Existing tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5" role="list" aria-label="Etiquetas do asset">
              {tags.map((tag) => (
                <span
                  key={tag}
                  role="listitem"
                  className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    aria-label={`Remover etiqueta ${tag}`}
                    className="ml-0.5 rounded-full text-secondary-foreground/60 hover:text-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="h-3 w-3" aria-hidden />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Tag input */}
          {tags.length < MAX_TAGS ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => commitTagInput(tagInput)}
                placeholder="Nova etiqueta (Enter ou vírgula para adicionar)"
                maxLength={MAX_TAG_LEN}
                aria-label="Adicionar etiqueta"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => commitTagInput(tagInput)}
                disabled={!tagInput.trim()}
                aria-label="Adicionar etiqueta"
                className="shrink-0"
              >
                <Plus className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Máximo de {MAX_TAGS} etiquetas atingido.
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Pressione Enter ou vírgula para adicionar. Backspace remove a última.
          </p>
        </div>
      </div>
    </ResponsiveSheet>
  )
}
