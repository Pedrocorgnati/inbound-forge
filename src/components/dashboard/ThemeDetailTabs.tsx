'use client'

import { useCallback, useMemo, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

/**
 * Task 025 (loop 05-27-inbound-forge-user-friendly) — P3: /themes/[id] mobile tabs.
 *
 * Em viewport < 768px os paineis de detalhe do tema colapsam em tabs (TabsList visivel,
 * apenas o painel ativo renderizado). Em >= 768px (md) os mesmos paineis voltam a ser
 * empilhados verticalmente (TabsList escondido, todos os TabsContent forcados a `block`),
 * preservando o layout desktop original.
 *
 * Tudo via CSS (forceMount + `md:!block`): sem matchMedia, sem hydration mismatch e sem
 * flash de conteudo — o SSR ja entrega a marcacao final e o JS so passa a controlar a tab
 * ativa no mobile. O estado da tab e persistido em `?tab=...` (Zero Estados Indefinidos:
 * valor invalido cai no primeiro painel).
 */

export interface ThemeDetailTab {
  /** Chave estavel usada em `?tab=...` e como value do Radix Tabs. */
  value: string
  /** Rotulo exibido no TabsTrigger (apenas mobile). */
  label: string
  /** Conteudo do painel. */
  content: ReactNode
}

interface ThemeDetailTabsProps {
  tabs: ThemeDetailTab[]
  /** Parametro de query usado para persistir a tab ativa (default `tab`). */
  queryKey?: string
}

export function ThemeDetailTabs({ tabs, queryKey = 'tab' }: ThemeDetailTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const tabValues = useMemo(() => tabs.map((t) => t.value), [tabs])
  const fallback = tabValues[0]

  // `?tab` invalido ou ausente -> primeiro painel (nunca estado indefinido).
  const rawTab = searchParams.get(queryKey)
  const activeTab = rawTab && tabValues.includes(rawTab) ? rawTab : fallback

  const handleTabChange = useCallback(
    (value: string) => {
      if (!tabValues.includes(value)) return
      const params = new URLSearchParams(searchParams.toString())
      params.set(queryKey, value)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [pathname, queryKey, router, searchParams, tabValues]
  )

  if (tabs.length === 0) return null

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} data-testid="theme-detail-tabs">
      <TabsList aria-label="Secoes do tema" className="w-full md:hidden" data-testid="theme-detail-tablist">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="flex-1"
            data-testid={`theme-detail-tab-${tab.value}`}
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map((tab) => (
        <TabsContent
          key={tab.value}
          value={tab.value}
          forceMount
          // forceMount mantem todos os paineis montados (Radix nao seta [hidden] quando
          // forceMount, entao escondemos o inativo via CSS): mobile colapsa em tabs
          // (data-[state=inactive]:hidden mostra so o painel ativo); desktop md:!block
          // reexibe todos empilhados (TabsList fica escondido), reproduzindo o layout original.
          className="data-[state=inactive]:hidden md:!mt-6 md:!block md:!animate-none"
          data-testid={`theme-detail-panel-${tab.value}`}
        >
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  )
}
