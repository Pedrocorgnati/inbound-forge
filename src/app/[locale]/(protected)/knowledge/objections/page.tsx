import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { ObjectionList } from '@/components/knowledge/ObjectionList'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'knowledge.objectionPage' })
  return {
    title: t('title'),
    description: t('description'),
  }
}

interface ObjectionsPageProps {
  params: Promise<{ locale: string }>
}

export default async function ObjectionsPage({ params }: ObjectionsPageProps) {
  const { locale } = await params
  const t = await getTranslations('knowledge.objectionPage')

  return (
    <div data-testid="objections-page" className="space-y-6">
      <div data-testid="objections-header">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t('title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('description')}
        </p>
      </div>

      <ObjectionList locale={locale} />
    </div>
  )
}
