// TASK-21 ST002 (CL-230l): Swagger UI navegavel consumindo /api/docs.
// Hospeda a UI sob /api/docs/ui por simetria com o endpoint JSON.

import type { Metadata } from 'next'
import { SwaggerRenderer } from '@/components/docs/SwaggerRenderer'

export const metadata: Metadata = {
  title: 'API Docs — Inbound Forge',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-static'

export default function ApiDocsPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="border-b border-border px-4 py-3">
        <h1 className="text-lg font-semibold">Inbound Forge — API Reference</h1>
        <p className="text-xs text-muted-foreground">
          Contrato OpenAPI servido em{' '}
          <code className="rounded bg-muted px-1">/api/docs</code>.
        </p>
      </div>
      <SwaggerRenderer specUrl="/api/docs" />
    </main>
  )
}
