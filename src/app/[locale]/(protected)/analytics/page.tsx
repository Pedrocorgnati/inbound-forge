import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard'
import { AsovTrendChart } from '@/components/analytics/AsovTrendChart'
import { getAsovTrend } from '@/lib/analytics-queries'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'analytics' })
  return { title: `${t('title')} | Inbound Forge`, description: t('description') }
}

interface AnalyticsPageProps {
  params: Promise<{ locale: string }>
}

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'analytics' })
  const tDash = await getTranslations({ locale, namespace: 'dashboard' })
  const asovTrend = await getAsovTrend(30).catch(() => [])

  return (
    <div data-testid="analytics-page" className="space-y-6">
      <div data-testid="analytics-header">
        <nav className="mb-2 text-sm text-muted-foreground" aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5">
            <li>
              <a href={`/${locale}/dashboard`} className="hover:text-foreground transition-colors">
                {tDash('title')}
              </a>
            </li>
            <li aria-hidden>/</li>
            <li className="text-foreground font-medium">{t('title')}</li>
          </ol>
        </nav>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t('title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('description')}
        </p>
      </div>

      <AnalyticsDashboard />

      <section className="space-y-2" data-testid="analytics-asov-section">
        <h2 className="text-lg font-semibold">ASoV — Active Share of Voice (30 dias)</h2>
        <AsovTrendChart data={asovTrend} />
      </section>
    </div>
  )
}
