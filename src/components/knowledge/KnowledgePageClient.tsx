'use client'

import { useState } from 'react'
import { KnowledgeSearchBar, type KnowledgeFilters } from './KnowledgeSearchBar'
import { KnowledgeTabs } from './knowledge-tabs'

interface KnowledgePageClientProps {
  activeTab: string
  locale: string
}

export function KnowledgePageClient({ activeTab, locale }: KnowledgePageClientProps) {
  const [filters, setFilters] = useState<KnowledgeFilters>({ search: '', status: '', type: '' })

  return (
    <div className="space-y-4">
      <KnowledgeSearchBar onChange={setFilters} />
      <KnowledgeTabs activeTab={activeTab} locale={locale} filters={filters} />
    </div>
  )
}
