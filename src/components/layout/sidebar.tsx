'use client'

import React, { useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { PanelLeft, X, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SidebarNav } from './sidebar-nav'
import { ProgressWidget } from './progress-widget'
import { Separator } from '@/components/ui/separator'
import { ROUTES } from '@/constants/routes'
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
  const sidebarRef = useRef<HTMLElement>(null)
  const touchStartX = useRef<number | null>(null)
  const [swipeOffset, setSwipeOffset] = React.useState(0)

  // Swipe-to-dismiss: swipe left 80px fecha o drawer mobile (F-028)
  function handleTouchStart(e: React.TouchEvent) {
    if (!mobileOpen) return
    touchStartX.current = e.touches[0].clientX
  }
  function handleTouchMove(e: React.TouchEvent) {
    if (!mobileOpen || touchStartX.current === null) return
    const delta = e.touches[0].clientX - touchStartX.current
    if (delta < 0) setSwipeOffset(Math.max(delta, -240))
  }
  function handleTouchEnd() {
    if (swipeOffset < -80) {
      onCloseMobile()
    }
    setSwipeOffset(0)
    touchStartX.current = null
  }

  // Escape key closes mobile drawer + focus trap (FE-007)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) {
        onCloseMobile()
        return
      }
      // Focus trap: keep Tab/Shift+Tab inside sidebar when mobile drawer is open
      if (e.key === 'Tab' && mobileOpen && sidebarRef.current) {
        const focusable = sidebarRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus() }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus() }
        }
      }
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
        ref={sidebarRef}
        data-testid="sidebar"
        role={mobileOpen ? 'dialog' : undefined}
        aria-modal={mobileOpen ? 'true' : undefined}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={swipeOffset !== 0 ? { transform: `translateX(${swipeOffset}px)`, transition: 'none' } : undefined}
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
          {/* Logo: símbolo (collapsed) ou full (expandido) — G19 */}
          {collapsed ? (
            <Image src="/images/logo-symbol.svg" alt="Inbound Forge" width={28} height={28} className="shrink-0" />
          ) : (
            <Image src="/images/logo-full.svg" alt="Inbound Forge" width={120} height={28} className="flex-1 object-contain object-left" />
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

        {/* Footer: Privacy + Terms links — G10 / TASK-5 CL-245 */}
        <Separator />
        <div className="px-3 py-2 flex flex-col gap-0.5">
          <Link
            href={`/${locale}${ROUTES.PRIVACY}`}
            data-testid="sidebar-privacy-link"
            className={cn(
              'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
              collapsed && 'justify-center'
            )}
          >
            <Shield className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {!collapsed && <span>Privacidade</span>}
          </Link>
          <Link
            href={`/${locale}${ROUTES.TERMS}`}
            data-testid="sidebar-terms-link"
            className={cn(
              'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
              collapsed && 'justify-center'
            )}
          >
            <Shield className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {!collapsed && <span>Termos de Uso</span>}
          </Link>
        </div>
      </aside>
    </>
  )
}
