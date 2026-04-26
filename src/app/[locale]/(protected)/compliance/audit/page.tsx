// TASK-9 ST002 (CL-288): pagina de auditoria de scraping.

import { Suspense } from 'react'
import { AuditFilters } from '@/components/compliance/AuditFilters'
import { ScrapingAuditTable } from '@/components/compliance/ScrapingAuditTable'
import { AuditLogDownloadButton } from '@/components/compliance/AuditLogDownloadButton'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function ScrapingAuditPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const query = new URLSearchParams(
    Object.entries(sp)
      .filter(([, v]) => typeof v === 'string' && v.length > 0)
      .map(([k, v]) => [k, v as string])
  ).toString()

  return (
    <section className="space-y-5" data-testid="compliance-audit-page">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Auditoria de coleta</h1>
          <p className="text-sm text-muted-foreground">
            Registros LGPD de cada execução de scraping — até 10k linhas por export.
          </p>
        </div>
        {/* Intake Review TASK-10 ST006 (CL-270): download com loading/erro + filename correto. */}
        <AuditLogDownloadButton
          endpoint={`/api/v1/compliance/scraping-audit/export${query ? `?${query}&format=csv` : '?format=csv'}`}
          filename={`scraping-audit-${new Date().toISOString().slice(0, 10)}.csv`}
          label="Baixar CSV"
        />
      </header>

      <Suspense fallback={null}>
        <AuditFilters />
      </Suspense>

      <Suspense fallback={<div className="h-40 animate-pulse rounded-md bg-muted/40" />}>
        <ScrapingAuditTable />
      </Suspense>
    </section>
  )
}
