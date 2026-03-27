import type { Metadata } from 'next'
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard'

export const metadata: Metadata = {
  title: 'Analytics | Inbound Forge',
  description: 'Métricas de desempenho do pipeline de inbound',
}

interface AnalyticsPageProps {
  params: Promise<{ locale: string }>
}

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const { locale } = await params

  return (
    <div data-testid="analytics-page" className="space-y-6">
      <div data-testid="analytics-header">
        <nav className="mb-2 text-sm text-muted-foreground" aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5">
            <li>
              <a href={`/${locale}/dashboard`} className="hover:text-foreground transition-colors">
                Dashboard
              </a>
            </li>
            <li aria-hidden>/</li>
            <li className="text-foreground font-medium">Analytics</li>
          </ol>
        </nav>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Analytics
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Métricas de desempenho do pipeline de inbound
        </p>
      </div>

      <AnalyticsDashboard />
    </div>
  )
}
