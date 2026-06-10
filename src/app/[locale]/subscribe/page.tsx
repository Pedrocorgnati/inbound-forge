import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { SubscribeFormClient } from '@/components/subscribe/SubscribeFormClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'subscribe' })
  return { title: t('title'), description: t('description') }
}

export default async function SubscribePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'subscribe' })
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('title')}</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">{t('description')}</p>
      <SubscribeFormClient source="subscribe-page" />
    </main>
  )
}
