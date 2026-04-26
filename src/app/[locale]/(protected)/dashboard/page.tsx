import type { Metadata } from 'next'
import { DashboardContent } from '@/components/dashboard/DashboardContent'
import { KnowledgeQualityBanner } from '@/components/dashboard/KnowledgeQualityBanner'
import { OnboardingResumeCard } from '@/components/dashboard/OnboardingResumeCard'
import { ScoringPhaseBadge } from '@/components/dashboard/ScoringPhaseBadge'
import { GenerateThemesButton } from '@/components/dashboard/GenerateThemesButton'
import { MvpCriteriaCard } from './MvpCriteriaCard'

export const metadata: Metadata = { title: 'Dashboard' }

interface PageProps {
  params: Promise<{ locale: string }>
}

export default async function DashboardPage({ params }: PageProps) {
  const { locale } = await params
  return (
    <>
      <KnowledgeQualityBanner locale={locale} />
      <OnboardingResumeCard locale={locale} />
      <div className="mb-3 flex items-center justify-between gap-3">
        <ScoringPhaseBadge />
        <GenerateThemesButton />
      </div>
      <MvpCriteriaCard />
      <DashboardContent />
    </>
  )
}
