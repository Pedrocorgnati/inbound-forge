import type { NavItem, NavSection } from '@/types'
import { ROUTES } from './routes'

// IA da sidebar agrupada por dominio (titleKey em nav.sections.*). Reduz a carga
// cognitiva dos 23 itens flat em 6 secoes. NAV_ITEMS (flat) e derivado para
// consumidores legados (BottomNav, busca, etc).
export const NAV_SECTIONS: NavSection[] = [
  {
    titleKey: 'overview',
    items: [{ labelKey: 'dashboard', href: ROUTES.DASHBOARD, icon: 'LayoutDashboard', badgeKey: null }],
  },
  {
    titleKey: 'content',
    items: [
      { labelKey: 'knowledge', href: ROUTES.KNOWLEDGE, icon: 'BookOpen', badgeKey: 'pendingEntries' },
      { labelKey: 'content', href: ROUTES.CONTENT, icon: 'FileText', badgeKey: 'pendingContent' },
      { labelKey: 'themes', href: '/themes', icon: 'Lightbulb', badgeKey: null },
      { labelKey: 'nicheOpportunities', href: '/niche-opportunities', icon: 'Target', badgeKey: null },
      { labelKey: 'assets', href: ROUTES.ASSETS, icon: 'Image', badgeKey: null },
    ],
  },
  {
    titleKey: 'publishing',
    items: [
      { labelKey: 'calendar', href: ROUTES.CALENDAR, icon: 'Calendar', badgeKey: 'pendingPublish' },
      { labelKey: 'fila', href: ROUTES.FILA, icon: 'ListChecks', badgeKey: 'pendingPublish' },
      { labelKey: 'blog', href: ROUTES.BLOG, icon: 'Globe', badgeKey: null },
      { labelKey: 'approvals', href: '/approvals', icon: 'CheckCircle2', badgeKey: null },
    ],
  },
  {
    titleKey: 'emailAutomation',
    items: [
      { labelKey: 'broadcasts', href: ROUTES.BROADCASTS, icon: 'Mail', badgeKey: null },
      { labelKey: 'subscribers', href: ROUTES.SUBSCRIBERS, icon: 'UserPlus', badgeKey: null },
      { labelKey: 'forms', href: ROUTES.FORMS, icon: 'FileInput', badgeKey: null },
      { labelKey: 'sequences', href: ROUTES.SEQUENCES, icon: 'Workflow', badgeKey: null },
      { labelKey: 'automations', href: ROUTES.AUTOMATIONS, icon: 'Zap', badgeKey: null },
    ],
  },
  {
    titleKey: 'leadsCrm',
    items: [
      { labelKey: 'leads', href: ROUTES.LEADS, icon: 'Users', badgeKey: null },
      { labelKey: 'meetings', href: ROUTES.MEETINGS, icon: 'CalendarCheck2', badgeKey: null },
      { labelKey: 'reconciliation', href: ROUTES.RECONCILIATION, icon: 'GitCompareArrows', badgeKey: 'pendingReconciliation' },
      { labelKey: 'utm', href: '/utm', icon: 'Link2', badgeKey: null },
    ],
  },
  {
    titleKey: 'analysisSystem',
    items: [
      { labelKey: 'analytics', href: ROUTES.ANALYTICS, icon: 'BarChart3', badgeKey: 'pendingReconciliation' },
      { labelKey: 'sources', href: ROUTES.SOURCES, icon: 'Database', badgeKey: null },
      { labelKey: 'compliance', href: '/compliance', icon: 'ShieldCheck', badgeKey: null },
      { labelKey: 'health', href: ROUTES.HEALTH, icon: 'Activity', badgeKey: null },
    ],
  },
]

// Lista flat derivada — mantida para consumidores existentes (BottomNav, etc).
export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items)
