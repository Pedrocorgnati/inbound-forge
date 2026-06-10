import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { PainList } from '@/components/knowledge/PainList'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'knowledge.painPage' })
  return {
    title: t('title'),
    description: t('description'),
  }
}

interface PainsPageProps {
  params: Promise<{ locale: string }>
}

export default async function PainsPage({ params }: PainsPageProps) {
  const { locale } = await params
  const t = await getTranslations('knowledge.painPage')

  return (
    <div data-testid="pains-page" className="space-y-6">
      <div data-testid="pains-header">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t('title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('description')}
        </p>
      </div>

      <PainList locale={locale} />
    </div>
  )
}
