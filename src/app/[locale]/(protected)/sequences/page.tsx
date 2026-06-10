import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { SequenceBuilderClient } from '@/components/sequences/SequenceBuilderClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'sequences' })
  return { title: `${t('title')} | Inbound Forge` }
}

export default async function SequencesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'sequences' })

  let sequences: { id: string; name: string; status: string; steps: number; enrollments: number }[] = []
  let loadError = false
  try {
    const rows = await prisma.nurtureSequence.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { _count: { select: { steps: true, enrollments: true } } },
    })
    sequences = rows.map((s) => ({ id: s.id, name: s.name, status: s.status, steps: s._count.steps, enrollments: s._count.enrollments }))
  } catch {
    loadError = true
  }

  return (
    <div data-testid="sequences-page" className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('description')}</p>
        </div>
        <SequenceBuilderClient />
      </div>

      {loadError ? (
        <p data-testid="sequences-error" className="text-sm text-red-600">{t('error')}</p>
      ) : sequences.length === 0 ? (
        <p data-testid="sequences-empty" className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table data-testid="sequences-table" className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">{t('colName')}</th>
                <th className="px-4 py-2">{t('colStatus')}</th>
                <th className="px-4 py-2">{t('colSteps')}</th>
                <th className="px-4 py-2">{t('colEnrollments')}</th>
              </tr>
            </thead>
            <tbody>
              {sequences.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{s.name}</td>
                  <td className="px-4 py-2">{t(`status.${s.status}`)}</td>
                  <td className="px-4 py-2 text-muted-foreground">{s.steps}</td>
                  <td className="px-4 py-2 text-muted-foreground">{s.enrollments}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
