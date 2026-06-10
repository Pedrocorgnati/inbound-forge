import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { PatternList } from '@/components/knowledge/PatternList'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'knowledge.patternPage' })
  return {
    title: t('title'),
    description: t('description'),
  }
}

interface PatternsPageProps {
  params: Promise<{ locale: string }>
}

export default async function PatternsPage({ params }: PatternsPageProps) {
  const { locale } = await params
  const t = await getTranslations('knowledge.patternPage')

  return (
    <div data-testid="patterns-page" className="space-y-6">
      <div data-testid="patterns-header">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t('title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('description')}
        </p>
      </div>

      <PatternList locale={locale} />
    </div>
  )
}
