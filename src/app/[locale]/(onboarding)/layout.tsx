import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { GuidedTour, GuidedTourTrigger } from '@/components/onboarding/GuidedTour'
import { InactivityNudge } from '@/components/onboarding/InactivityNudge'
import { ExamplesCarousel } from '@/components/onboarding/ExamplesCarousel'

interface OnboardingLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function OnboardingLayout({ children, params }: OnboardingLayoutProps) {
  const { locale: _locale } = await params

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      redirect(`/${_locale}/login`)
    }
  } catch {
    redirect(`/${_locale}/login`)
  }

  return (
    <div
      data-testid="onboarding-layout"
      className="flex min-h-dvh items-center justify-center bg-background px-4 py-8"
    >
      <div className="w-full max-w-2xl space-y-4">
        <div className="flex justify-end">
          <GuidedTourTrigger />
        </div>
        <ExamplesCarousel />
        {children}
        <GuidedTour />
        <InactivityNudge />
      </div>
    </div>
  )
}
