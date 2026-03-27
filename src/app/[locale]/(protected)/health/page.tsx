import type { Metadata } from 'next'
import { HealthDashboard } from '@/components/health/HealthDashboard'

export const metadata: Metadata = {
  title: 'Saude do Sistema | Inbound Forge',
  description: 'Monitoramento de workers, alertas e uso de API',
}

interface HealthPageProps {
  params: Promise<{ locale: string }>
}

export default async function HealthPage({ params }: HealthPageProps) {
  const { locale } = await params

  return (
    <div data-testid="health-page" className="space-y-6">
      <div data-testid="health-header">
        <nav className="mb-2 text-sm text-muted-foreground" aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5">
            <li>
              <a
                href={`/${locale}/dashboard`}
                className="hover:text-foreground transition-colors"
              >
                Dashboard
              </a>
            </li>
            <li aria-hidden>/</li>
            <li className="text-foreground font-medium">Saude do Sistema</li>
          </ol>
        </nav>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Saude do Sistema
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitoramento de workers, alertas e uso de API
        </p>
      </div>

      <HealthDashboard />
    </div>
  )
}
