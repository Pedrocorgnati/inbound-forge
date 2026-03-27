import type { Metadata } from 'next'
import { LeadForm } from '@/components/leads/LeadForm'

export const metadata: Metadata = {
  title: 'Novo Lead | Inbound Forge',
  description: 'Registre um novo lead',
}

interface NewLeadPageProps {
  params: Promise<{ locale: string }>
}

export default async function NewLeadPage({ params }: NewLeadPageProps) {
  const { locale } = await params

  return (
    <div data-testid="new-lead-page" className="space-y-6">
      <div>
        <nav className="mb-2 text-sm text-muted-foreground" aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5">
            <li>
              <a href={`/${locale}/dashboard`} className="hover:text-foreground transition-colors">
                Dashboard
              </a>
            </li>
            <li aria-hidden>/</li>
            <li>
              <a href={`/${locale}/leads`} className="hover:text-foreground transition-colors">
                Leads
              </a>
            </li>
            <li aria-hidden>/</li>
            <li className="text-foreground font-medium">Novo Lead</li>
          </ol>
        </nav>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Registrar Lead
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Adicione um novo lead ao sistema de rastreamento
        </p>
      </div>

      <LeadForm locale={locale} />
    </div>
  )
}
