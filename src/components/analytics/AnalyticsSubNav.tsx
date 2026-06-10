'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface AnalyticsSubNavProps {
  locale: string
}

// FE-01 / Zero Orfaos: a index de analytics + as 4 sub-paginas (channels, themes,
// learning, asov) ficavam sem navegacao entre si. Esta tab-bar (renderizada pelo
// layout do segmento) linka as 5 rotas. Labels hardcoded em PT-BR, consistentes
// com os H1 ja hardcoded das sub-paginas.
const TABS = [
  { segment: '', label: 'Visão geral' },
  { segment: '/channels', label: 'Canais' },
  { segment: '/themes', label: 'Temas' },
  { segment: '/learning', label: 'Learn-to-Rank' },
  { segment: '/asov', label: 'ASoV' },
] as const

export function AnalyticsSubNav({ locale }: AnalyticsSubNavProps) {
  const pathname = usePathname()
  const base = `/${locale}/analytics`

  return (
    <nav data-testid="analytics-subnav" aria-label="Seções de Analytics" className="flex gap-1 overflow-x-auto border-b">
      {TABS.map((tab) => {
        const href = `${base}${tab.segment}`
        // Match EXATO: a index '/analytics' e prefixo de todas as sub-rotas; com
        // startsWith a aba "Visão geral" acenderia em todas.
        const isActive = pathname === href
        return (
          <Link
            key={tab.segment || 'overview'}
            data-testid={`analytics-subnav-${tab.segment.replace('/', '') || 'overview'}`}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              '-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors min-h-[44px] flex items-center',
              isActive
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
