// Intake Review TASK-8 ST003 (CL-224) — rota dedicada de solution pattern.

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { SolutionPatternService } from '@/lib/services/solution-pattern.service'
import { PatternDetailView } from '@/components/knowledge/PatternDetailView'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ locale: string; id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const pattern = await SolutionPatternService.findById(id)
  return {
    title: pattern?.name ? `${pattern.name} — Padrão` : 'Padrão de Solução',
  }
}

export default async function PatternDetailPage({ params }: PageProps) {
  const { locale, id } = await params
  const pattern = await SolutionPatternService.findById(id)
  if (!pattern) notFound()

  const mapped = {
    id: pattern.id,
    name: pattern.name,
    description: pattern.description ?? null,
    status: (pattern as unknown as { status?: string }).status ?? null,
    steps: (pattern as unknown as { steps?: unknown }).steps ?? null,
    pains: pattern.pain ? [pattern.pain] : [],
    cases: pattern.case ? [pattern.case] : [],
    versions: [] as { id?: string; version?: string | number; createdAt?: string | Date }[],
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <PatternDetailView locale={locale} pattern={mapped} />
    </div>
  )
}
