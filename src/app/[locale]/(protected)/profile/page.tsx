import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { ProfileForm } from '@/components/settings/ProfileForm'

export const dynamic = 'force-dynamic'

interface ProfilePageProps {
  params: Promise<{ locale: string }>
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { locale } = await params
  const t = await getTranslations('settings.profile')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect(`/${locale}/login`)

  const initial = {
    name: (user.user_metadata?.name as string | undefined) ?? '',
    email: user.email ?? '',
  }

  return (
    <section className="space-y-6 max-w-xl">
      <header>
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </header>
      <ProfileForm initial={initial} />
    </section>
  )
}
