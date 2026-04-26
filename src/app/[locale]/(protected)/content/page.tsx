import type { Metadata } from 'next'
import { ContentPageClient } from '@/components/content/ContentPageClient'

export const metadata: Metadata = { title: 'Conteúdo' }

export default async function ContentPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  return <ContentPageClient locale={locale} />
}
