import type { Metadata } from 'next'
import { ReconciliationPageClient } from './_components/ReconciliationPageClient'

export const metadata: Metadata = {
  title: 'Reconciliação | Inbound Forge',
  description: 'Reconcilie cliques, temas e conversões semanalmente.',
}

export default async function ReconciliationPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return (
    <div className="space-y-6" data-testid="reconciliation-page">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Reconciliação</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Matching de tema para conversão com status matched, unmatched e disputed.
        </p>
      </div>
      <ReconciliationPageClient locale={locale} />
    </div>
  )
}
