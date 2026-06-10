import type { Metadata } from 'next'
import Link from 'next/link'
import { AnalyticsLearningPageContent } from '@/components/analytics/DedicatedAnalyticsPages'

export const metadata: Metadata = {
  title: 'Learn-to-Rank | Inbound Forge',
  description: 'Status operacional do aprendizado por conversão.',
}

interface PageProps {
  params: Promise<{ locale: string }>
}

export default async function AnalyticsLearningPage({ params }: PageProps) {
  const { locale } = await params

  return (
    <div className="space-y-6" data-testid="analytics-learning-page">
      <header className="space-y-2">
        <nav className="text-sm text-muted-foreground" aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5">
            <li>
              <Link href={`/${locale}/analytics`} className="transition-colors hover:text-foreground">
                Analytics
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="font-medium text-foreground">Aprendizado</li>
          </ol>
        </nav>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Learn-to-Rank</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Posts, conversões, modelo atual e último retreino do motor de priorização.
          </p>
        </div>
      </header>

      <AnalyticsLearningPageContent />
    </div>
  )
}
