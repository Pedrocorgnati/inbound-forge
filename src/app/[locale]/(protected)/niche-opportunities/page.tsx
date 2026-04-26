// TASK-11 (CL-249): pagina de Niche Opportunities com filtros.

'use client'

import { useState } from 'react'
import { NicheOpportunityTable } from '@/components/niches/NicheOpportunityTable'

const TABS = ['NEW', 'APPROVED', 'DISCARDED'] as const

export default function NicheOpportunitiesPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('NEW')

  return (
    <section className="space-y-5" data-testid="niche-opportunities-page">
      <header>
        <h1 className="text-2xl font-semibold">Oportunidades de nicho</h1>
        <p className="text-sm text-muted-foreground">
          Aprove para criar um tema ou descarte com motivo.
        </p>
      </header>

      <div role="tablist" className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={
              tab === t
                ? 'border-b-2 border-primary px-3 py-2 text-sm font-medium text-primary'
                : 'px-3 py-2 text-sm text-muted-foreground hover:text-foreground'
            }
          >
            {t === 'NEW' ? 'Novas' : t === 'APPROVED' ? 'Aprovadas' : 'Descartadas'}
          </button>
        ))}
      </div>

      <NicheOpportunityTable status={tab} />
    </section>
  )
}
