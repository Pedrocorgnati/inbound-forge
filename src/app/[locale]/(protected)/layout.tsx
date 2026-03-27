export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/prisma'
import { AppShell } from '@/components/layout/app-shell'
import { CookieConsentProvider } from '@/components/consent/CookieConsentProvider'
import { CookieConsentBanner } from '@/components/consent/CookieConsentBanner'
import { GA4Script } from '@/components/analytics/GA4Script'
import { KeyboardShortcutsProvider } from '@/components/ux/KeyboardShortcutsProvider'
import type { WorkerHeartbeat, SidebarBadges, ProgressWidgetData } from '@/types'

interface ProtectedLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

async function getServerData() {
  const workers: WorkerHeartbeat[] = [
    { workerId: 'scraping-1', type: 'SCRAPING', status: 'IDLE', lastPing: new Date() },
    { workerId: 'image-1', type: 'IMAGE', status: 'IDLE', lastPing: new Date() },
    { workerId: 'publishing-1', type: 'PUBLISHING', status: 'IDLE', lastPing: new Date() },
  ]

  const pendingReconciliation = await prisma.reconciliationItem
    .count({ where: { resolved: false } })
    .catch(() => 0)

  const badges: SidebarBadges = {
    pendingEntries: 0,
    pendingContent: 0,
    pendingPublish: 0,
    pendingReconciliation,
  }

  const progress: ProgressWidgetData = {
    published: 0,
    scheduled: 0,
    target: 20,
  }

  const monthlyCost = 0

  return { workers, badges, progress, monthlyCost }
}

export default async function ProtectedLayout({ children, params }: ProtectedLayoutProps) {
  const { locale } = await params

  let userName: string | null = null

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      redirect(`/${locale}/login`)
    }
    userName = user?.user_metadata?.full_name ?? user?.email ?? null
  } catch {
    redirect(`/${locale}/login`)
  }

  const { workers, badges, progress, monthlyCost } = await getServerData()

  return (
    <CookieConsentProvider>
      <KeyboardShortcutsProvider locale={locale}>
        <AppShell
          userName={userName}
          workers={workers}
          badges={badges}
          progress={progress}
          monthlyCost={monthlyCost}
          locale={locale}
        >
          {children}
        </AppShell>
      </KeyboardShortcutsProvider>
      <GA4Script />
      <CookieConsentBanner />
    </CookieConsentProvider>
  )
}
