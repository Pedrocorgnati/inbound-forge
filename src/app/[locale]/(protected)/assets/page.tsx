import type { Metadata } from 'next'
import { AssetLibraryClient } from './AssetLibraryClient'

export const metadata: Metadata = {
  title: 'Biblioteca de Assets | Inbound Forge',
  description: 'Gerencie imagens e assets visuais para suas campanhas de marketing.',
}

export default function AssetsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Biblioteca de Assets
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Faça upload e gerencie imagens para suas campanhas.
        </p>
      </div>

      <AssetLibraryClient />
    </div>
  )
}
