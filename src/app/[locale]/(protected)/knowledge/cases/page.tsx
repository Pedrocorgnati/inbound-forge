import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { CaseList } from '@/components/knowledge/CaseList'

export const metadata: Metadata = {
  title: 'Cases — Base de Conhecimento',
  description: 'Gerencie seus cases de sucesso',
}

interface CasesPageProps {
  params: Promise<{ locale: string }>
}

export default async function CasesPage({ params }: CasesPageProps) {
  const { locale } = await params
  const t = await getTranslations('knowledge.casePage')

  return (
    <div data-testid="cases-page" className="space-y-6">
      <div data-testid="cases-header">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t('title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('description')}
        </p>
      </div>

      <CaseList locale={locale} />
    </div>
  )
}
