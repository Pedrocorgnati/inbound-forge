'use client'

import React from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { BuildVersionBadge } from './BuildVersionBadge'
import { CriticalAlertBanner } from '@/components/shared/CriticalAlertBanner'
import { useSidebarState } from '@/hooks/useSidebarState'
import type { SidebarBadges, ProgressWidgetData, WorkerHeartbeat } from '@/types'

interface AppShellProps {
  children: React.ReactNode
  userName: string | null
  locale: string
  workers?: WorkerHeartbeat[]
  monthlyCost?: number | null
  badges?: SidebarBadges
  progress?: ProgressWidgetData
}

export function AppShell({
  children,
  userName,
  locale,
  workers,
  monthlyCost,
  badges,
  progress,
}: AppShellProps) {
  const { collapsed, mobileOpen, toggleCollapsed, openMobile, closeMobile } = useSidebarState()

  return (
    <div data-testid="app-shell" className="flex h-dvh overflow-hidden bg-background">
      {/* Skip navigation */}
      <a data-testid="skip-nav-link" href="#main-content" className="skip-nav">
        Pular para conteúdo principal
      </a>

      {/* Sidebar */}
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        badges={badges}
        progress={progress}
        locale={locale}
        onToggleCollapsed={toggleCollapsed}
        onCloseMobile={closeMobile}
      />

      {/* Main area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <Header
          userName={userName}
          workers={workers}
          monthlyCost={monthlyCost}
          locale={locale}
          onMenuToggle={openMobile}
        />

        <CriticalAlertBanner />

        <main
          id="main-content"
          data-testid="main-content"
          className="flex-1 overflow-y-auto p-4 md:p-6"
          tabIndex={-1}
        >
          {children}
        </main>

        <footer className="flex justify-end border-t border-border px-4 py-2">
          <BuildVersionBadge />
        </footer>
      </div>
    </div>
  )
}
