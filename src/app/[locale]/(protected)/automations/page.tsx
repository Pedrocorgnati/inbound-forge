import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { AutomationBuilderClient } from '@/components/automations/AutomationBuilderClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'automations' })
  return { title: `${t('title')} | Inbound Forge` }
}

export default async function AutomationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'automations' })

  let rules: { id: string; name: string; trigger: string; actionType: string; enabled: boolean; runs: number }[] = []
  let loadError = false
  try {
    const rows = await prisma.automationRule.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { _count: { select: { runs: true } } },
    })
    rules = rows.map((r) => ({ id: r.id, name: r.name, trigger: r.trigger, actionType: r.actionType, enabled: r.enabled, runs: r._count.runs }))
  } catch {
    loadError = true
  }

  return (
    <div data-testid="automations-page" className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('description')}</p>
        </div>
        <AutomationBuilderClient />
      </div>

      {loadError ? (
        <p data-testid="automations-error" className="text-sm text-red-600">{t('error')}</p>
      ) : rules.length === 0 ? (
        <p data-testid="automations-empty" className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table data-testid="automations-table" className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">{t('colName')}</th>
                <th className="px-4 py-2">{t('colTrigger')}</th>
                <th className="px-4 py-2">{t('colAction')}</th>
                <th className="px-4 py-2">{t('colEnabled')}</th>
                <th className="px-4 py-2">{t('colRuns')}</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{r.name}</td>
                  <td className="px-4 py-2">{t(`trigger.${r.trigger}`)}</td>
                  <td className="px-4 py-2">{t(`action.${r.actionType}`)}</td>
                  <td className="px-4 py-2 text-muted-foreground">{r.enabled ? t('enabled') : t('disabled')}</td>
                  <td className="px-4 py-2 text-muted-foreground">{r.runs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
