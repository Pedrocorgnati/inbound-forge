import type { NavItem } from '@/types'
import { ROUTES } from './routes'

export const NAV_ITEMS: NavItem[] = [
  {
    labelKey: 'dashboard',
    href: ROUTES.DASHBOARD,
    icon: 'LayoutDashboard',
    badgeKey: null,
  },
  {
    labelKey: 'knowledge',
    href: ROUTES.KNOWLEDGE,
    icon: 'BookOpen',
    badgeKey: 'pendingEntries',
  },
  {
    labelKey: 'content',
    href: ROUTES.CONTENT,
    icon: 'FileText',
    badgeKey: 'pendingContent',
  },
  {
    labelKey: 'calendar',
    href: ROUTES.CALENDAR,
    icon: 'Calendar',
    badgeKey: 'pendingPublish',
  },
  {
    labelKey: 'fila',
    href: ROUTES.FILA,
    icon: 'ListChecks',
    badgeKey: 'pendingPublish',
  },
  {
    labelKey: 'blog',
    href: ROUTES.BLOG,
    icon: 'Globe',
    badgeKey: null,
  },
  {
    labelKey: 'leads',
    href: ROUTES.LEADS,
    icon: 'Users',
    badgeKey: null,
  },
  {
    labelKey: 'reconciliation',
    href: ROUTES.RECONCILIATION,
    icon: 'GitCompareArrows',
    badgeKey: 'pendingReconciliation',
  },
  {
    labelKey: 'meetings',
    href: ROUTES.MEETINGS,
    icon: 'CalendarCheck2',
    badgeKey: null,
  },
  {
    labelKey: 'utm',
    href: '/utm',
    icon: 'Link2',
    badgeKey: null,
  },
  {
    labelKey: 'analytics',
    href: ROUTES.ANALYTICS,
    icon: 'BarChart3',
    badgeKey: 'pendingReconciliation',
  },
  {
    labelKey: 'sources',
    href: ROUTES.SOURCES,
    icon: 'Database',
    badgeKey: null,
  },
  // FE-02: workflows centrais que ficavam orfaos (paginas existiam, sem link na sidebar).
  {
    labelKey: 'approvals',
    href: '/approvals',
    icon: 'CheckCircle2',
    badgeKey: null,
  },
  {
    labelKey: 'themes',
    href: '/themes',
    icon: 'Lightbulb',
    badgeKey: null,
  },
  {
    labelKey: 'nicheOpportunities',
    href: '/niche-opportunities',
    icon: 'Target',
    badgeKey: null,
  },
  {
    labelKey: 'assets',
    href: ROUTES.ASSETS,
    icon: 'Image',
    badgeKey: null,
  },
  {
    labelKey: 'compliance',
    href: '/compliance',
    icon: 'ShieldCheck',
    badgeKey: null,
  },
  {
    labelKey: 'health',
    href: ROUTES.HEALTH,
    icon: 'Activity',
    badgeKey: null,
  },
]
