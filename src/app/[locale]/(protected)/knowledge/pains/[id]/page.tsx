// Intake Review TASK-8 ST001 (CL-220) — rota dedicada de detalhe de dor.

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { PainLibraryService } from '@/lib/services/pain-library.service'
import { PainDetailView } from '@/components/knowledge/PainDetailView'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ locale: string; id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const pain = await PainLibraryService.findById(id)
  return {
    title: pain?.title ? `${pain.title} — Dor` : 'Dor',
  }
}

export default async function PainDetailPage({ params }: PageProps) {
  const { locale, id } = await params
  const pain = await PainLibraryService.findById(id)
  if (!pain) notFound()

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <PainDetailView locale={locale} pain={pain as never} />
    </div>
  )
}
