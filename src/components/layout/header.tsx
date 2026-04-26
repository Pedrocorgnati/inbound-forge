'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Menu, LogOut, Settings, User } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { WorkerDot } from './worker-dot'
import { MonthlyCostBadge } from './monthly-cost-badge'
import { UserAvatar } from '@/components/shared/user-avatar'
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { NotificationBell } from './NotificationBell'
import { HeaderReconciliationBadge } from './HeaderReconciliationBadge'
import { LocaleSwitcher } from '@/components/ui/locale-switcher'
import { useAuth } from '@/hooks/useAuth'
import type { WorkerHeartbeat } from '@/types'

interface HeaderProps {
  userName: string | null
  workers?: WorkerHeartbeat[]
  monthlyCost?: number | null
  locale: string
  onMenuToggle: () => void
}

const DEFAULT_WORKERS: WorkerHeartbeat[] = [
  { workerId: 'scraping-1', type: 'SCRAPING', status: 'IDLE', lastPing: new Date() },
  { workerId: 'image-1', type: 'IMAGE', status: 'IDLE', lastPing: new Date() },
  { workerId: 'publishing-1', type: 'PUBLISHING', status: 'IDLE', lastPing: new Date() },
]

export function Header({
  userName,
  workers = DEFAULT_WORKERS,
  monthlyCost,
  locale,
  onMenuToggle,
}: HeaderProps) {
  const { signOut } = useAuth()
  const router = useRouter()
  const tAuth = useTranslations('auth')
  const tHeader = useTranslations('header')
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const displayWorkers = workers.length > 0 ? workers : DEFAULT_WORKERS

  async function handleLogout() {
    setIsLoggingOut(true)
    try {
      await signOut()
      toast.success(tAuth('logoutSuccess'))
      router.push(`/${locale}/login`)
    } catch {
      toast.error(tAuth('logoutError'))
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <TooltipProvider>
      <header
        data-testid="header"
        role="banner"
        className={cn(
          'sticky top-0 z-40 flex h-16 w-full items-center justify-between px-4 gap-3',
          'bg-surface/95 backdrop-blur-sm border-b border-border'
        )}
      >
        {/* Mobile hamburger */}
        <button
          data-testid="header-mobile-menu-button"
          type="button"
          aria-label={tHeader('openMenu')}
          onClick={onMenuToggle}
          className={cn(
            'flex md:hidden items-center justify-center h-11 w-11 rounded-md',
            'hover:bg-muted transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
          )}
        >
          <Menu className="h-5 w-5 text-foreground" />
        </button>

        {/* Logo */}
        <Link
          data-testid="header-logo"
          href={`/${locale}/dashboard`}
          className="flex items-center gap-2 text-lg font-bold text-foreground hover:opacity-80 transition-opacity"
        >
          Inbound Forge
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Worker dots — visíveis em todos os tamanhos (RESOLVED: G004) */}
        <div data-testid="header-workers" className="flex items-center gap-1 md:gap-3">
          {displayWorkers.map((worker) => (
            <WorkerDot
              key={worker.type}
              type={worker.type}
              status={worker.status}
              lastSeen={worker.lastPing}
              locale={locale}
            />
          ))}
        </div>

        {/* Reconciliation badge — TASK-3 ST003 (CL-129) */}
        <HeaderReconciliationBadge locale={locale} />

        {/* Cost badge */}
        <div data-testid="header-cost-badge" className="hidden md:flex">
          <MonthlyCostBadge cost={monthlyCost ?? null} locale={locale} />
        </div>

        {/* Locale switcher */}
        <div data-testid="header-locale-switcher" className="hidden md:flex">
          <LocaleSwitcher />
        </div>

        {/* Notification bell — Intake Review TASK-11 (CL-245) */}
        <NotificationBell />

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Profile link */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={`/${locale}/profile`}
              data-testid="header-profile-link"
              aria-label={tHeader('profileLabel') || 'Perfil'}
              className="flex h-11 w-11 items-center justify-center rounded-md hover:bg-muted transition-colors"
            >
              <User className="h-4 w-4 text-muted-foreground" />
            </Link>
          </TooltipTrigger>
          <TooltipContent>Perfil</TooltipContent>
        </Tooltip>

        {/* Settings link */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={`/${locale}/settings`}
              data-testid="header-settings-link"
              aria-label={tHeader('settingsLabel') || 'Configurações'}
              className="flex h-11 w-11 items-center justify-center rounded-md hover:bg-muted transition-colors"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
            </Link>
          </TooltipTrigger>
          <TooltipContent>Configurações</TooltipContent>
        </Tooltip>

        {/* Avatar */}
        <UserAvatar data-testid="header-user-avatar" name={userName} size="sm" />

        {/* Logout */}
        <Button
          data-testid="header-logout-button"
          variant="ghost"
          size="icon"
          aria-label={tHeader('logoutLabel')}
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex h-11 w-11"
        >
          <LogOut className="h-4 w-4 text-muted-foreground" />
        </Button>
      </header>
    </TooltipProvider>
  )
}
