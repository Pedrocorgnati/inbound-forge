'use client'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export type ThemeTab = 'pending_approval' | 'approved' | 'rejected' | 'archived' | 'all'

interface ThemesTabsProps {
  activeTab: ThemeTab
  onTabChange: (tab: ThemeTab) => void
}

const TABS: Array<{ value: ThemeTab; label: string }> = [
  { value: 'pending_approval', label: 'Pendentes' },
  { value: 'approved', label: 'Aprovados' },
  { value: 'rejected', label: 'Rejeitados' },
  { value: 'archived', label: 'Arquivados' },
  { value: 'all', label: 'Todos' },
]

export function ThemesTabs({ activeTab, onTabChange }: ThemesTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as ThemeTab)}>
      <TabsList aria-label="Status dos temas" data-testid="themes-tabs">
        {TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} data-testid={`themes-tab-${tab.value}`}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
