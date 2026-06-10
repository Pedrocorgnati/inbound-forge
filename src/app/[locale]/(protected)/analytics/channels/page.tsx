import type { Metadata } from 'next'
import Link from 'next/link'
import { AnalyticsChannelsPageContent } from '@/components/analytics/DedicatedAnalyticsPages'

export const metadata: Metadata = {
  title: 'Analytics de canais | Inbound Forge',
  description: 'Comparativo de engajamento e conversão por canal.',
}

interface PageProps {
  params: Promise<{ locale: string }>
}

export default async function AnalyticsChannelsPage({ params }: PageProps) {
  const { locale } = await params

  return (
    <div className="space-y-6" data-testid="analytics-channels-page">
      <header className="space-y-2">
        <nav className="text-sm text-muted-foreground" aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5">
            <li>
              <Link href={`/${locale}/analytics`} className="transition-colors hover:text-foreground">
                Analytics
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="font-medium text-foreground">Canais</li>
          </ol>
        </nav>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Canais</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Instagram, LinkedIn e Blog comparados por cliques UTM, leads e conversões.
          </p>
        </div>
      </header>

      <AnalyticsChannelsPageContent />
    </div>
  )
}
