import type { Metadata } from 'next'
import { AsovDashboard } from '@/components/analytics/AsovDashboard'

export const metadata: Metadata = { title: 'ASoV Dashboard' }

export default function AsovPage() {
  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Share of Voice (ASoV)</h1>
        <p className="text-sm text-muted-foreground">
          Participacao em respostas de LLMs por tema nos ultimos 7/30 dias.
        </p>
      </header>
      <AsovDashboard />
    </main>
  )
}
