import { redirect } from 'next/navigation'

interface SettingsRootPageProps {
  params: Promise<{ locale: string }>
}

export default async function SettingsRootPage({ params }: SettingsRootPageProps) {
  const { locale } = await params
  redirect(`/${locale}/settings/api`)
}
