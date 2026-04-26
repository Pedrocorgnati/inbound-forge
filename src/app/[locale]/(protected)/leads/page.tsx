import type { Metadata } from 'next'
import { LeadsList } from '@/components/leads/LeadsList'
import { LeadExportButton } from '@/components/leads/LeadExportButton'

export const metadata: Metadata = {
  title: 'Leads | Inbound Forge',
  description: 'Gerencie seus leads e conversões',
}

interface LeadsPageProps {
  params: Promise<{ locale: string }>
}

export default async function LeadsPage({ params }: LeadsPageProps) {
  const { locale } = await params

  return (
    <div data-testid="leads-page" className="space-y-6">
      <div data-testid="leads-header" className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Leads
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Rastreamento de leads e conversões
          </p>
        </div>
        <LeadExportButton />
      </div>

      <LeadsList locale={locale} />
    </div>
  )
}
