import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

interface OnboardingLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function OnboardingLayout({ children, params }: OnboardingLayoutProps) {
  const { locale } = await params

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      redirect(`/${locale}/login`)
    }
  } catch {
    redirect(`/${locale}/login`)
  }

  return (
    <div
      data-testid="onboarding-layout"
      className="flex min-h-dvh items-center justify-center bg-background px-4 py-8"
    >
      <div className="w-full max-w-2xl">
        {children}
      </div>
    </div>
  )
}
