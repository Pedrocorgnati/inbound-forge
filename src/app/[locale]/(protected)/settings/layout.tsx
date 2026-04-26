import { SettingsSidebar } from '@/components/settings/SettingsSidebar'

interface SettingsLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function SettingsLayout({ children, params }: SettingsLayoutProps) {
  const { locale } = await params

  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <SettingsSidebar locale={locale} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}
