import type { Metadata } from 'next'
import { ApprovalsInbox } from './_components/ApprovalsInbox'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Aprovações - Inbound Forge',
}

export default async function ApprovalsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  return <ApprovalsInbox locale={locale} />
}
