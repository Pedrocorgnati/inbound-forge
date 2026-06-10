import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { BroadcastSendButton } from '@/components/broadcasts/BroadcastSendButton'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'broadcasts' })
  return { title: `${t('title')} | Inbound Forge` }
}

export default async function BroadcastsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'broadcasts' })

  let broadcasts: Awaited<ReturnType<typeof prisma.broadcast.findMany>> = []
  let loadError = false
  try {
    broadcasts = await prisma.broadcast.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })
  } catch {
    loadError = true
  }

  return (
    <div data-testid="broadcasts-page" className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('description')}</p>
        </div>
        <Link
          href={`/${locale}/broadcasts/new`}
          data-testid="broadcast-new-link"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {t('new')}
        </Link>
      </div>

      {loadError ? (
        <p data-testid="broadcasts-error" className="text-sm text-red-600">{t('error')}</p>
      ) : broadcasts.length === 0 ? (
        <p data-testid="broadcasts-empty" className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {t('empty')}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table data-testid="broadcasts-table" className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">{t('colSubject')}</th>
                <th className="px-4 py-2">{t('colStatus')}</th>
                <th className="px-4 py-2">{t('colRecipients')}</th>
                <th className="px-4 py-2">{t('colSent')}</th>
                <th className="px-4 py-2">{t('colDate')}</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {broadcasts.map((b) => (
                <tr key={b.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{b.subject}</td>
                  <td className="px-4 py-2">{t(`status.${b.status}`)}</td>
                  <td className="px-4 py-2 text-muted-foreground">{b.totalRecipients}</td>
                  <td className="px-4 py-2 text-muted-foreground">{b.sentCount}</td>
                  <td className="px-4 py-2 text-muted-foreground">{b.createdAt.toISOString().slice(0, 10)}</td>
                  <td className="px-4 py-2 text-right">
                    {(b.status === 'DRAFT' || b.status === 'SCHEDULED') && (
                      <BroadcastSendButton broadcastId={b.id} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
