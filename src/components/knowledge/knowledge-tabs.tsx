'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { CaseList } from './CaseList'
import { PainList } from './PainList'
import { PatternList } from './PatternList'
import { ObjectionList } from './ObjectionList'
import type { KnowledgeFilters } from './KnowledgeSearchBar'

interface KnowledgeTabsProps {
  activeTab: string
  locale?: string
  filters?: KnowledgeFilters
}

export function KnowledgeTabs({ activeTab, locale = 'pt', filters: _filters }: KnowledgeTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('knowledge.tabs')

  // Extract locale from pathname if not provided
  const resolvedLocale = locale || pathname.split('/')[1] || 'pt'

  function handleTabChange(value: string) {
    router.push(`${pathname}?tab=${value}`, { scroll: false })
  }

  const TABS = [
    { value: 'cases', label: t('cases') },
    { value: 'pains', label: t('pains') },
    { value: 'patterns', label: t('patterns') },
    { value: 'objections', label: t('objections') },
  ] as const

  return (
    <Tabs data-testid="knowledge-tabs" value={activeTab} onValueChange={handleTabChange}>
      <TabsList data-testid="knowledge-tabs-list" className="w-full md:w-auto">
        {TABS.map((tab) => (
          <TabsTrigger data-testid={`knowledge-tab-${tab.value}`} key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent data-testid="knowledge-tab-content-cases" value="cases">
        <CaseList locale={resolvedLocale} />
      </TabsContent>

      <TabsContent data-testid="knowledge-tab-content-pains" value="pains">
        <PainList locale={resolvedLocale} />
      </TabsContent>

      <TabsContent data-testid="knowledge-tab-content-patterns" value="patterns">
        <PatternList locale={resolvedLocale} />
      </TabsContent>

      <TabsContent data-testid="knowledge-tab-content-objections" value="objections">
        <ObjectionList locale={resolvedLocale} />
      </TabsContent>
    </Tabs>
  )
}
