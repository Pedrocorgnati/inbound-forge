'use client'

// module-10: Asset Picker Hook
// Rastreabilidade: TASK-5 ST001, TASK-2 ST002, INT-063
// Hook para seleção de assets filtrados por compatibilidade de aspect ratio

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { VisualAsset } from '@/types/visual-asset'
import type { TemplateType } from '@/types/image-template'
import { IMAGE_DIMENSIONS } from '@/lib/constants/image-worker'

// ─── Constants ──────────────────────────────────────────────────────────────────

const ASPECT_RATIO_TOLERANCE = 0.2
const ASSETS_FETCH_LIMIT = 24

// ─── Compatibility Check (client-side mirror of asset-compose.service) ─────────

function isAssetCompatibleWithTemplate(
  asset: VisualAsset,
  templateType: TemplateType
): boolean {
  // SVGs always compatible (no dimension data)
  if (!asset.widthPx || !asset.heightPx) return true

  const templateDims   = IMAGE_DIMENSIONS[templateType]
  const templateAspect = templateDims.widthPx / templateDims.heightPx
  const assetAspect    = asset.widthPx / asset.heightPx

  return Math.abs(templateAspect - assetAspect) / templateAspect < ASPECT_RATIO_TOLERANCE
}

// ─── Hook ───────────────────────────────────────────────────────────────────────

export interface UseAssetPickerReturn {
  assets:     VisualAsset[]
  isLoading:  boolean
  selectedId: string | null
  select:     (id: string) => void
  clear:      () => void
}

export function useAssetPicker(templateType: TemplateType): UseAssetPickerReturn {
  const [allAssets, setAllAssets]   = useState<VisualAsset[]>([])
  const [isLoading, setIsLoading]  = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Fetch assets
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    fetch(`/api/visual-assets?limit=${ASSETS_FETCH_LIMIT}`)
      .then((res) => {
        if (!res.ok) throw new Error('Falha ao carregar assets')
        return res.json()
      })
      .then((data: { items: VisualAsset[] }) => {
        if (!cancelled) {
          setAllAssets(data.items)
          setIsLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAllAssets([])
          setIsLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [])

  // Filter by aspect ratio compatibility
  const assets = useMemo(
    () => allAssets.filter((a) => isAssetCompatibleWithTemplate(a, templateType)),
    [allAssets, templateType]
  )

  // Clear selection if current asset becomes incompatible after templateType change
  useEffect(() => {
    if (!selectedId) return
    const stillCompatible = assets.some((a) => a.id === selectedId)
    if (!stillCompatible) {
      setSelectedId(null)
    }
  }, [assets, selectedId])

  const select = useCallback((id: string) => {
    setSelectedId(id)
  }, [])

  const clear = useCallback(() => {
    setSelectedId(null)
  }, [])

  return { assets, isLoading, selectedId, select, clear }
}
