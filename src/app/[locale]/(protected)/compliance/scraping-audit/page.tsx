import { Suspense } from 'react'
import type { Metadata } from 'next'
import { ScrapingAuditTable } from './_components/ScrapingAuditTable'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Auditoria de scraping | Inbound Forge',
  description: 'Eventos de scraping com decisao robots.txt, latencia, status_code e correlacao LGPD.',
}

export default function ScrapingAuditPage() {
  return (
    <section className="space-y-5" data-testid="scraping-audit-page">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-normal">Auditoria de scraping</h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          Eventos de coleta com decisao robots.txt, latencia, status_code, correlation_id e vinculo com
          PIIRevealAudit quando houver relacao aplicavel.
        </p>
      </header>

      <Suspense fallback={<div className="h-64 animate-pulse rounded-md bg-muted/40" />}>
        <ScrapingAuditTable />
      </Suspense>
    </section>
  )
}
