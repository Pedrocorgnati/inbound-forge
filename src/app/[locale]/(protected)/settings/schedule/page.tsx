import { getTranslations } from 'next-intl/server'
import { ScheduleEditor } from '@/components/settings/ScheduleEditor'

export const dynamic = 'force-dynamic'

export default async function SettingsSchedulePage() {
  const t = await getTranslations('settings.schedule')

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </header>
      <ScheduleEditor />
    </section>
  )
}
