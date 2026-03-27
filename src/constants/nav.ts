import type { NavItem } from '@/types'

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'LayoutDashboard',
    badgeKey: null,
  },
  {
    label: 'Base de Conhecimento',
    href: '/knowledge',
    icon: 'BookOpen',
    badgeKey: 'pendingEntries',
  },
  {
    label: 'Conteúdo',
    href: '/content',
    icon: 'FileText',
    badgeKey: 'pendingContent',
  },
  {
    label: 'Calendário',
    href: '/calendar',
    icon: 'Calendar',
    badgeKey: 'pendingPublish',
  },
  {
    label: 'Blog',
    href: '/blog',
    icon: 'Globe',
    badgeKey: null,
  },
  {
    label: 'Leads',
    href: '/leads',
    icon: 'Users',
    badgeKey: null,
  },
  {
    label: 'UTM Links',
    href: '/utm',
    icon: 'Link2',
    badgeKey: null,
  },
  {
    label: 'Analytics',
    href: '/analytics',
    icon: 'BarChart3',
    badgeKey: 'pendingReconciliation',
  },
  {
    label: 'Saúde',
    href: '/health',
    icon: 'Activity',
    badgeKey: null,
  },
]
