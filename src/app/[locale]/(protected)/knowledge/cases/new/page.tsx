import type { Metadata } from 'next'
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

  return (
    <div data-testid="new-case-page" className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Novo Case
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Adicione um novo case de sucesso à base de conhecimento
        </p>
      </div>

      <CaseForm mode="create" locale={locale} />
    </div>
  )
}
