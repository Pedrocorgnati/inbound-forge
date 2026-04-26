import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { CaseForm } from '@/components/knowledge/CaseForm'

export const metadata: Metadata = {
  title: 'Novo Case — Base de Conhecimento',
  description: 'Crie um novo case de sucesso',
}

interface NewCasePageProps {
  params: Promise<{ locale: string }>
}

export default async function NewCasePage({ params }: NewCasePageProps) {
  const { locale } = await params
  const t = await getTranslations('knowledge.casePage')

  return (
    <div data-testid="new-case-page" className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t('new')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('newDescription')}
        </p>
      </div>

      <CaseForm mode="create" locale={locale} />
    </div>
  )
}
