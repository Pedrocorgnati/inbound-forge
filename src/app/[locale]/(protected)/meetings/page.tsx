import type { Metadata } from 'next'
import { MeetingsPageClient } from './_components/MeetingsPageClient'

export const metadata: Metadata = {
  title: 'Reuniões | Inbound Forge',
  description: 'Reuniões Cal.com confirmadas e canceladas com tema de origem.',
}

export default async function MeetingsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return (
    <div className="space-y-6" data-testid="meetings-page">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Reuniões</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visão operacional das reuniões vindas do Cal.com, ligadas ao lead e ao tema de origem.
        </p>
      </div>
      <MeetingsPageClient locale={locale} />
    </div>
  )
}
