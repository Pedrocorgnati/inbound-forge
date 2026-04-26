import type { Metadata } from 'next'
import { SourceList } from '@/components/sources/SourceList'
import { SourceAddButton } from '@/components/sources/SourceAddButton'

export const metadata: Metadata = {
  title: 'Fontes de Scraping — Inbound Forge',
}

export default function SourcesPage() {
  return (
    <div data-testid="sources-page" className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Fontes Curadas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie as fontes de scraping usadas pelo sistema para coletar temas automaticamente.
          </p>
        </div>
        <SourceAddButton />
      </div>

      <SourceList />
    </div>
  )
}
