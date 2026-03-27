import type { Metadata } from 'next'
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

  return (
    <div data-testid="cases-page" className="space-y-6">
      <div data-testid="cases-header">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Cases de Sucesso
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie seus cases para alimentar a geração de conteúdo
        </p>
      </div>

      <CaseList locale={locale} />
    </div>
  )
}
