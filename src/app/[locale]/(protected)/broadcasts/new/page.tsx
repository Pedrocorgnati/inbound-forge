import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { BroadcastComposerClient } from '@/components/broadcasts/BroadcastComposerClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'broadcasts' })
  return { title: `${t('new')} | Inbound Forge` }
}

export default async function NewBroadcastPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'broadcasts' })
  return (
    <div data-testid="broadcast-new-page" className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('composer.title')}</h1>
      </div>
      <BroadcastComposerClient locale={locale} />
    </div>
  )
}
