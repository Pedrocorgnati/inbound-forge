import type { Metadata } from 'next'
import Link from 'next/link'
import { AnalyticsThemesPageContent } from '@/components/analytics/DedicatedAnalyticsPages'

export const metadata: Metadata = {
  title: 'Analytics de temas | Inbound Forge',
  description: 'Ranking de temas por taxa real de conversão.',
}

interface PageProps {
  params: Promise<{ locale: string }>
}

export default async function AnalyticsThemesPage({ params }: PageProps) {
  const { locale } = await params

  return (
    <div className="space-y-6" data-testid="analytics-themes-page">
      <header className="space-y-2">
        <nav className="text-sm text-muted-foreground" aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5">
            <li>
              <Link href={`/${locale}/analytics`} className="transition-colors hover:text-foreground">
                Analytics
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="font-medium text-foreground">Temas</li>
          </ol>
        </nav>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Temas por conversão</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ranking de temas com leads, conversões e tendência por período.
          </p>
        </div>
      </header>

      <AnalyticsThemesPageContent />
    </div>
  )
}
