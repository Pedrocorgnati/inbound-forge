import type { Metadata } from 'next'
import { SourceDetail } from './_components/SourceDetail'

export const metadata: Metadata = {
  title: 'Detalhe da fonte - Inbound Forge',
}

interface PageProps {
  params: Promise<{ locale: string; id: string }>
}

export default async function SourceDetailPage({ params }: PageProps) {
  const { locale, id } = await params

  return <SourceDetail sourceId={id} locale={locale} />
}
