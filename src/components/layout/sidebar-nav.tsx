'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Calendar,
  Globe,
  Users,
  BarChart3,
  Link2,
  Activity,
  Database,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { NAV_ITEMS } from '@/constants/nav'
import type { SidebarBadges } from '@/types'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  BookOpen,
  FileText,
  Calendar,
  Globe,
  Users,
  BarChart3,
  Link2,
  Activity,
  Database,
}

interface SidebarNavProps {
  collapsed: boolean
  badges?: SidebarBadges
  locale: string
  onItemClick?: () => void
}

export function SidebarNav({ collapsed, badges = {}, locale, onItemClick }: SidebarNavProps) {
  const pathname = usePathname()
  const t = useTranslations('nav')

  return (
    <nav data-testid="sidebar-nav" aria-label="Navegação principal" className="flex flex-col gap-2 px-2 py-2"> {/* RESOLVED G10: gap-1→gap-2 (8px) para WCAG touch spacing */}
      {NAV_ITEMS.map((item) => {
        const isActive = pathname?.includes(item.href) ?? false
        const Icon = ICON_MAP[item.icon] ?? LayoutDashboard
        const count = item.badgeKey ? (badges[item.badgeKey] ?? 0) : 0
        const href = `/${locale}${item.href}`

        return (
          <Link
            key={item.href}
            data-testid={`sidebar-nav-item-${item.href.replace('/', '')}`}
            href={href}
            title={collapsed ? t(item.labelKey) : undefined}
            aria-current={isActive ? 'page' : undefined}
            onClick={onItemClick}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 min-h-[44px] transition-colors duration-[50ms]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
              isActive
                ? 'bg-primary-light text-primary font-semibold'
                : 'text-muted-foreground font-normal hover:bg-surface-raised hover:text-foreground'
            )}
          >
            <span className="relative shrink-0">
              <Icon className={cn('h-5 w-5', isActive ? 'text-primary' : '')} />
              {collapsed && count > 0 && (
                <Badge
                  variant="warning"
                  aria-label={`${count} itens pendentes`}
                  className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 text-[10px]"
                >
                  {count}
                </Badge>
              )}
            </span>

            {!collapsed && (
              <>
                <span className="flex-1 text-sm truncate">{t(item.labelKey)}</span>
                {count > 0 && (
                  <Badge
                    variant="warning"
                    aria-label={`${count} itens pendentes`}
                    className="ml-auto"
                  >
                    {count}
                  </Badge>
                )}
              </>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
