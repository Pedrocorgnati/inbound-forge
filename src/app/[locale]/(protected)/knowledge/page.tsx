import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { KnowledgeTabs } from '@/components/knowledge/knowledge-tabs'
import { ProgressGateWrapper } from '@/components/knowledge/ProgressGateWrapper'

export const metadata: Metadata = { title: 'Base de Conhecimento' }

const VALID_TABS = ['cases', 'pains', 'patterns', 'objections'] as const

interface KnowledgePageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ tab?: string }>
}

export default async function KnowledgePage({ params, searchParams }: KnowledgePageProps) {
  const { locale } = await params
  const { tab } = await searchParams

  // Redirect to default tab if missing or invalid
  if (!tab || !VALID_TABS.includes(tab as typeof VALID_TABS[number])) {
    redirect(`/${locale}/knowledge?tab=cases`)
  }

  return (
    <div data-testid="knowledge-page" className="space-y-6">
      {/* Page header */}
      <div data-testid="knowledge-header">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Base de Conhecimento
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie seus cases, dores e padrões de solução
        </p>
      </div>

      {/* ProgressGate — progresso da base de conhecimento */}
      <ProgressGateWrapper locale={locale} />

      {/* Tabs */}
      <KnowledgeTabs activeTab={tab} locale={locale} />
    </div>
  )
}
