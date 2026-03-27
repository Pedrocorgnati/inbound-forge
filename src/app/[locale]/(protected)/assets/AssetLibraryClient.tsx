'use client'

import { useCallback, useState } from 'react'
import { AssetUploadZone } from '@/components/asset-library/AssetUploadZone'
import { AssetFilters } from '@/components/asset-library/AssetFilters'
import { AssetGallery } from '@/components/asset-library/AssetGallery'

interface FilterState {
  fileType?: string
  tag?: string
}

export function AssetLibraryClient() {
  const [filter, setFilter] = useState<FilterState>({})
  const [refreshCounter, setRefreshCounter] = useState(0)

  const handleUploadComplete = useCallback(() => {
    setRefreshCounter((c) => c + 1)
  }, [])

  const handleFilterChange = useCallback((newFilter: FilterState) => {
    setFilter(newFilter)
  }, [])

  return (
    <div className="space-y-6">
      <AssetUploadZone onUploadComplete={handleUploadComplete} />

      <AssetFilters filter={filter} onChange={handleFilterChange} />

      <AssetGallery filter={filter} onRefresh={refreshCounter} />
    </div>
  )
}
