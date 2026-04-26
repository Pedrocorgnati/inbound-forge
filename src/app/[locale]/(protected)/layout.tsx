export const dynamic = 'force-dynamic'

import { unstable_cache } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/prisma'
import { AppShell } from '@/components/layout/app-shell'
import { CookieConsentProvider } from '@/components/consent/CookieConsentProvider'
import { CookieConsentBanner } from '@/components/consent/CookieConsentBanner'
import { GA4Script } from '@/components/analytics/GA4Script'
import { KeyboardShortcutsProvider } from '@/components/ux/KeyboardShortcutsProvider'
import { DegradedBanner } from '@/components/shared/degraded-banner'
import { SeedIncompleteBanner } from '@/components/onboarding/SeedIncompleteBanner'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { getDegradedServiceNames } from '@/lib/services/service-health'
import { getActivationForOperator } from '@/lib/onboarding/activation-event'
import type { WorkerHeartbeat, SidebarBadges, ProgressWidgetData } from '@/types'

interface ProtectedLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

const getCachedReconciliationCount = unstable_cache(
  async () => prisma.reconciliationItem.count({ where: { resolved: false } }).catch(() => 0),
  ['reconciliation-pending-count'],
  { tags: ['reconciliation-count'], revalidate: 60 }
)

async function getServerData() {
  const workers: WorkerHeartbeat[] = [
    { workerId: 'scraping-1', type: 'SCRAPING', status: 'IDLE', lastPing: new Date() },
    { workerId: 'image-1', type: 'IMAGE', status: 'IDLE', lastPing: new Date() },
    { workerId: 'publishing-1', type: 'PUBLISHING', status: 'IDLE', lastPing: new Date() },
  ]

  const pendingReconciliation = await getCachedReconciliationCount()

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
  let userId: string | null = null

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      redirect(`/${locale}/login`)
    }
    userName = user?.user_metadata?.full_name ?? user?.email ?? null
    userId = user?.id ?? null
  } catch {
    redirect(`/${locale}/login`)
  }

  const { workers, badges, progress, monthlyCost } = await getServerData()

  // TASK-2 ST005: verificar serviços degradados para exibir banner (CL-132)
  const degradedServices = await getDegradedServiceNames().catch(() => [])

  // TASK-1 ST005 (CL-030): contar seed e ativacao para decidir banner incompleto
  const [seedCases, seedPains, activation] = await Promise.all([
    prisma.caseLibraryEntry.count().catch(() => 0),
    prisma.painLibraryEntry.count().catch(() => 0),
    userId ? getActivationForOperator(userId).catch(() => null) : Promise.resolve(null),
  ])

  return (
    <CookieConsentProvider>
      <KeyboardShortcutsProvider locale={locale}>
        <SeedIncompleteBanner
          casesCount={seedCases}
          painsCount={seedPains}
          locale={locale}
          activated={!!activation}
        />
        {degradedServices.length > 0 && (
          <div className="px-4 pt-4">
            <DegradedBanner services={degradedServices} />
          </div>
        )}
        <AppShell
          userName={userName}
          workers={workers}
          badges={badges}
          progress={progress}
          monthlyCost={monthlyCost}
          locale={locale}
        >
          <Breadcrumbs />
          {children}
        </AppShell>
      </KeyboardShortcutsProvider>
      <GA4Script />
      <CookieConsentBanner />
    </CookieConsentProvider>
  )
}
