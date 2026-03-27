'use client'

import { useCallback, useEffect, useState } from 'react'
import { ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { Pagination } from '@/components/ui/pagination'
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/shared/empty-state'
import { ASSET_UPLOAD_CONFIG } from '@/lib/constants/asset-library'
import { AssetCard } from './AssetCard'
import { AssetPreviewModal } from './AssetPreviewModal'
import type { VisualAsset, PaginatedAssets } from '@/types/visual-asset'

interface AssetGalleryProps {
  filter?: { fileType?: string; tag?: string }
  onRefresh?: number
}

export function AssetGallery({ filter, onRefresh }: AssetGalleryProps) {
  const [data, setData] = useState<PaginatedAssets | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<VisualAsset | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Preview
  const [previewAsset, setPreviewAsset] = useState<VisualAsset | null>(null)

  const fetchAssets = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(ASSET_UPLOAD_CONFIG.pageSize))
      if (filter?.fileType) params.set('type', filter.fileType)
      if (filter?.tag) params.set('tag', filter.tag)

      const res = await fetch(`/api/visual-assets?${params.toString()}`)

      if (!res.ok) {
        throw new Error('Falha ao carregar assets')
      }

      const json: PaginatedAssets = await res.json()
      setData(json)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [page, filter?.fileType, filter?.tag])

  // Fetch on mount, page/filter change, or external refresh trigger
  useEffect(() => {
    fetchAssets()
  }, [fetchAssets, onRefresh])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [filter?.fileType, filter?.tag])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/visual-assets/${deleteTarget.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Falha ao excluir asset')
      }

      toast.success(`"${deleteTarget.originalName}" excluído`)
      setDeleteTarget(null)
      fetchAssets()
    } catch {
      toast.error('Erro ao excluir asset. Tente novamente.')
    } finally {
      setIsDeleting(false)
    }
  }, [deleteTarget, fetchAssets])

  // Loading state
  if (isLoading) {
    return (
      <div
        role="status"
        aria-label="Carregando assets..."
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
      >
        {Array.from({ length: ASSET_UPLOAD_CONFIG.pageSize }, (_, i) => (
          <div key={i} className="rounded-lg border border-border overflow-hidden">
            <Skeleton className="aspect-square w-full" />
            <div className="p-3 space-y-2">
              <Skeleton variant="text" className="w-3/4" />
              <Skeleton variant="text" className="w-1/2" />
            </div>
          </div>
        ))}
        <span className="sr-only">Carregando assets...</span>
      </div>
    )
  }

  // Error state
  if (error && !data) {
    return (
      <EmptyState
        icon={<ImageIcon className="h-12 w-12" />}
        title="Erro ao carregar assets"
        description={error}
        ctaLabel="Tentar novamente"
        onCtaClick={fetchAssets}
      />
    )
  }

  // Empty state
  if (!data || data.items.length === 0) {
    return (
      <EmptyState
        icon={<ImageIcon className="h-12 w-12" />}
        title="Nenhum asset encontrado"
        description={
          filter?.fileType || filter?.tag
            ? 'Tente ajustar os filtros para encontrar seus assets.'
            : 'Faça upload de imagens para começar a construir sua biblioteca de assets.'
        }
      />
    )
  }

  return (
    <>
      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {data.items.map((asset) => (
          <AssetCard
            key={asset.id}
            asset={asset}
            onDelete={(id) => {
              const target = data.items.find((a) => a.id === id)
              if (target) setDeleteTarget(target)
            }}
            onClick={(a) => setPreviewAsset(a)}
          />
        ))}
      </div>

      {/* Pagination */}
      <div className="mt-6">
        <Pagination
          total={data.total}
          page={page}
          pageSize={ASSET_UPLOAD_CONFIG.pageSize}
          onPageChange={setPage}
        />
      </div>

      {/* Delete confirmation modal */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Excluir asset"
        description={
          deleteTarget
            ? `Tem certeza que deseja excluir "${deleteTarget.originalName}"? Esta ação não pode ser desfeita.`
            : ''
        }
        onConfirm={handleDelete}
        confirmLabel={isDeleting ? 'Excluindo...' : 'Excluir'}
        isDestructive
      />

      {/* Preview modal */}
      <AssetPreviewModal
        asset={previewAsset}
        open={previewAsset !== null}
        onClose={() => setPreviewAsset(null)}
      />
    </>
  )
}
