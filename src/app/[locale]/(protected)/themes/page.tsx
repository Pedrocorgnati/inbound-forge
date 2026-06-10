import type { Metadata } from 'next'
import { ThemesIndex } from './_components/ThemesIndex'

export const metadata: Metadata = {
  title: 'Temas - Inbound Forge',
}

export default async function ThemesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  return <ThemesIndex locale={locale} />
}
