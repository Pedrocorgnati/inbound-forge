'use client'

// AssetGallery — grid com click-to-lightbox.
// Intake-Review TASK-18 ST002 (CL-CG-040). Consome /api/v1/assets direto.

import { useEffect, useState } from 'react'
import { AssetLightbox } from './AssetLightbox'

type Asset = {
  id: string
  fileName: string
  originalName?: string | null
  storageUrl: string
  thumbnailUrl?: string | null
  fileType?: string | null
  tags?: string[]
  uploadedBy?: string | null
  widthPx?: number | null
  heightPx?: number | null
  fileSizeBytes?: number | null
}

type Props = {
  search?: string
  className?: string
}

export function AssetGallery({ search, className }: Props) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const params = new URLSearchParams({ limit: '60' })
    if (search) params.set('search', search)
    fetch(`/api/v1/assets?${params}`)
      .then(async (r) => {
        const json = await r.json()
        if (!r.ok) throw new Error(json?.error ?? 'Falha ao carregar')
        return (json.data ?? []) as Asset[]
      })
      .then((data) => !cancelled && setAssets(data))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : 'Erro'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [search])

  return (
    <section className={className} data-testid="asset-gallery">
      {loading && <p className="text-xs text-muted-foreground">Carregando...</p>}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      {!loading && assets.length === 0 && (
        <p className="text-xs text-muted-foreground">Nenhum asset encontrado.</p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {assets.map((a, i) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setActive(i)}
            className="group overflow-hidden rounded border border-border bg-card hover:border-primary"
            data-testid="asset-card"
            aria-label={`Abrir ${a.originalName ?? a.fileName}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={a.thumbnailUrl ?? a.storageUrl}
              alt={a.originalName ?? a.fileName}
              className="aspect-square w-full object-cover transition group-hover:opacity-90"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      <AssetLightbox
        open={active !== null}
        onClose={() => setActive(null)}
        assets={assets}
        activeIndex={active ?? 0}
        onIndexChange={setActive}
      />
    </section>
  )
}
