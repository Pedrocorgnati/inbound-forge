import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { BroadcastSendButton } from '@/components/broadcasts/BroadcastSendButton'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/EmptyState'

const BROADCAST_STATUS_VARIANT: Record<string, 'default' | 'info' | 'warning' | 'success' | 'danger'> = {
  DRAFT: 'default', SCHEDULED: 'info', SENDING: 'warning', SENT: 'success', CANCELED: 'default', FAILED: 'danger',
}

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
        <div data-testid="broadcasts-error"><EmptyState variant="error" title={t('error')} /></div>
      ) : broadcasts.length === 0 ? (
        <div data-testid="broadcasts-empty">
          <EmptyState variant="noData" title={t('empty')} actionLabel={t('new')} actionHref={`/${locale}/broadcasts/new`} />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table data-testid="broadcasts-table" className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-2">{t('colSubject')}</th>
                <th scope="col" className="px-4 py-2">{t('colStatus')}</th>
                <th scope="col" className="px-4 py-2">{t('colRecipients')}</th>
                <th scope="col" className="px-4 py-2">{t('colSent')}</th>
                <th scope="col" className="px-4 py-2">{t('colDate')}</th>
                <th scope="col" className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {broadcasts.map((b) => (
                <tr key={b.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{b.subject}</td>
                  <td className="px-4 py-2"><Badge variant={BROADCAST_STATUS_VARIANT[b.status] ?? 'default'}>{t(`status.${b.status}`)}</Badge></td>
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
