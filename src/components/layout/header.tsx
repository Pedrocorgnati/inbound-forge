'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Menu, LogOut, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { WorkerDot } from './worker-dot'
import { MonthlyCostBadge } from './monthly-cost-badge'
import { UserAvatar } from '@/components/shared/user-avatar'
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { useAuth } from '@/hooks/use-auth'
import { useReconciliationStats } from '@/hooks/useReconciliationStats'
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
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { pendingCount: reconciliationCount } = useReconciliationStats()

  const displayWorkers = workers.length > 0 ? workers : DEFAULT_WORKERS

  async function handleLogout() {
    setIsLoggingOut(true)
    try {
      await signOut()
      toast.success('Sessão encerrada com sucesso')
      router.push(`/${locale}/login`)
    } catch {
      toast.error('Erro ao encerrar sessão. Tente novamente.')
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
          aria-label="Abrir menu de navegação"
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

        {/* Reconciliation badge */}
        {reconciliationCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href={`/${locale}/analytics`}
                data-testid="header-reconciliation-badge"
                aria-label={`${reconciliationCount} itens de reconciliação pendentes`}
                className="relative flex items-center justify-center h-9 w-9 rounded-md hover:bg-muted transition-colors"
              >
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {reconciliationCount}
                </span>
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              {reconciliationCount} itens de reconciliação pendentes
            </TooltipContent>
          </Tooltip>
        )}

        {/* Cost badge */}
        <div data-testid="header-cost-badge" className="hidden md:flex">
          <MonthlyCostBadge cost={monthlyCost ?? null} />
        </div>

        {/* Avatar */}
        <UserAvatar data-testid="header-user-avatar" name={userName} size="sm" />

        {/* Logout */}
        <Button
          data-testid="header-logout-button"
          variant="ghost"
          size="icon"
          aria-label="Sair da aplicação"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="hidden md:flex h-11 w-11"
        >
          <LogOut className="h-4 w-4 text-muted-foreground" />
        </Button>
      </header>
    </TooltipProvider>
  )
}
