'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { SETTINGS_NAV } from '@/constants/settings'

interface SettingsSidebarProps {
  locale: string
}

export function SettingsSidebar({ locale }: SettingsSidebarProps) {
  const pathname = usePathname()
  const t = useTranslations('settings.nav')

  return (
    <aside
      data-testid="settings-sidebar"
      aria-label="Navegação de configurações"
      className="w-full md:w-60 shrink-0"
    >
      <nav className="flex flex-row gap-1 overflow-x-auto md:flex-col md:gap-2">
        {SETTINGS_NAV.map((item) => {
          const Icon = item.icon
          const href = `/${locale}${item.href}`
          const isActive = pathname?.startsWith(href) ?? false

          return (
            <Link
              key={item.href}
              data-testid={`settings-nav-${item.labelKey}`}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 min-h-[44px] text-sm transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                isActive
                  ? 'bg-primary-light text-primary font-semibold'
                  : 'text-muted-foreground font-normal hover:bg-surface-raised hover:text-foreground'
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', isActive && 'text-primary')} />
              <span className="truncate">{t(item.labelKey)}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
