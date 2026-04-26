import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { KnowledgePageClient } from '@/components/knowledge/KnowledgePageClient'
import { ProgressGateWrapper } from '@/components/knowledge/ProgressGateWrapper'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'knowledge' })
  return { title: t('title') }
}

const VALID_TABS = ['cases', 'pains', 'patterns', 'objections'] as const

interface KnowledgePageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ tab?: string }>
}

export default async function KnowledgePage({ params, searchParams }: KnowledgePageProps) {
  const { locale } = await params
  const { tab } = await searchParams
  const t = await getTranslations({ locale, namespace: 'knowledge' })

  // Redirect to default tab if missing or invalid
  if (!tab || !VALID_TABS.includes(tab as typeof VALID_TABS[number])) {
    redirect(`/${locale}/knowledge?tab=cases`)
  }

  return (
    <div data-testid="knowledge-page" className="space-y-6">
      {/* Page header */}
      <div data-testid="knowledge-header">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t('title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('description')}
        </p>
      </div>

      {/* ProgressGate — progresso da base de conhecimento */}
      <ProgressGateWrapper locale={locale} />

      {/* Search + Tabs */}
      <KnowledgePageClient activeTab={tab} locale={locale} />
    </div>
  )
}
