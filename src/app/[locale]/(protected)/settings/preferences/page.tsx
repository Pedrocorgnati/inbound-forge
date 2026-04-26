import { getTranslations } from 'next-intl/server'
import { PreferencesEditor } from '@/components/settings/PreferencesEditor'

export const dynamic = 'force-dynamic'

export default async function SettingsPreferencesPage() {
  const t = await getTranslations('settings.preferences')

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </header>
      <PreferencesEditor />
    </section>
  )
}
