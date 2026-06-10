import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { QueueBoard } from '@/components/queue/QueueBoard'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'queue' })
  return { title: `${t('title')} | Inbound Forge`, description: t('description') }
}

export default async function FilaPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'queue' })

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('description')}
        </p>
      </header>
      <QueueBoard />
    </section>
  )
}
