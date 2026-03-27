'use client'

import React, { useEffect } from 'react'
import { PanelLeft, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SidebarNav } from './sidebar-nav'
import { ProgressWidget } from './progress-widget'
import { Separator } from '@/components/ui/separator'
import type { SidebarBadges, ProgressWidgetData } from '@/types'

interface SidebarProps {
  collapsed: boolean
  mobileOpen: boolean
  badges?: SidebarBadges
  progress?: ProgressWidgetData
  locale: string
  onToggleCollapsed: () => void
  onCloseMobile: () => void
}

export function Sidebar({
  collapsed,
  mobileOpen,
  badges,
  progress,
  locale,
  onToggleCollapsed,
  onCloseMobile,
}: SidebarProps) {
  // Escape key closes mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) onCloseMobile()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [mobileOpen, onCloseMobile])

  const progressData = progress ?? { published: 0, scheduled: 0, target: 0 }

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          data-testid="sidebar-backdrop"
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          aria-hidden="true"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        data-testid="sidebar"
        role={mobileOpen ? 'dialog' : undefined}
        aria-modal={mobileOpen ? 'true' : undefined}
        className={cn(
          'flex flex-col bg-surface border-r border-border h-full z-50 transition-[width,transform] duration-150 ease-in-out', // RESOLVED: transition-all → transition-[width,transform] (G011)
          // Desktop
          'hidden md:flex',
          collapsed ? 'md:w-16' : 'md:w-60',
          // Mobile: fixed drawer
          'fixed inset-y-0 left-0 md:relative',
          mobileOpen
            ? 'flex w-60 translate-x-0'
            : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Header */}
        <div data-testid="sidebar-header" className="flex items-center h-16 px-3 border-b border-border shrink-0">
          {!collapsed && (
            <span className="flex-1 text-base font-bold text-foreground truncate">
              Inbound Forge
            </span>
          )}

          {/* Mobile close button */}
          <button
            data-testid="sidebar-mobile-close-button"
            type="button"
            onClick={onCloseMobile}
            aria-label="Fechar menu"
            className={cn(
              // RESOLVED: touch target 44px conforme MOBILE-GUIDE.md (G007)
              'md:hidden flex items-center justify-center h-11 w-11 rounded-md hover:bg-muted',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              collapsed ? 'ml-auto' : 'ml-2'
            )}
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>

          {/* Desktop toggle button */}
          <button
            data-testid="sidebar-toggle-button"
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            className={cn(
              'hidden md:flex items-center justify-center h-9 w-9 rounded-md hover:bg-muted transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              collapsed ? 'mx-auto' : 'ml-auto'
            )}
          >
            <PanelLeft
              className={cn(
                'h-5 w-5 text-muted-foreground transition-transform duration-150',
                collapsed && 'rotate-180'
              )}
            />
          </button>
        </div>

        {/* Navigation */}
        <div data-testid="sidebar-nav-container" className="flex-1 overflow-y-auto">
          <SidebarNav
            collapsed={collapsed}
            badges={badges}
            locale={locale}
            onItemClick={onCloseMobile}
          />
        </div>

        {/* Progress widget */}
        <Separator />
        <ProgressWidget
          published={progressData.published}
          scheduled={progressData.scheduled}
          target={progressData.target}
          collapsed={collapsed}
        />
      </aside>
    </>
  )
}
