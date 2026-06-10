import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { decryptSubscriberEmail } from '@/lib/email/subscriber'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/EmptyState'

const SUBSCRIBER_STATUS_VARIANT: Record<string, 'default' | 'warning' | 'success' | 'danger'> = {
  PENDING: 'warning', CONFIRMED: 'success', UNSUBSCRIBED: 'default', BOUNCED: 'danger', COMPLAINED: 'danger',
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'subscribers' })
  return { title: `${t('title')} | Inbound Forge` }
}

// Mascara o email (PII): primeira letra + dominio. SEC-008: nunca expoe full por padrao.
function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '•••'
  const [local, domain] = email.split('@')
  return `${local.slice(0, 1)}•••@${domain}`
}

export default async function SubscribersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'subscribers' })

  let subscribers: { id: string; email: string; status: string; channel: string | null; createdAt: Date }[] = []
  let loadError = false
  try {
    const rows = await prisma.emailSubscriber.findMany({ orderBy: { createdAt: 'desc' }, take: 200 })
    subscribers = rows.map((s) => ({
      id: s.id,
      email: maskEmail(decryptSubscriberEmail(s.encryptedEmail)),
      status: s.status,
      channel: s.channel,
      createdAt: s.createdAt,
    }))
  } catch {
    loadError = true
  }

  return (
    <div data-testid="subscribers-page" className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('description')}</p>
      </div>

      {loadError ? (
        <div data-testid="subscribers-error"><EmptyState variant="error" title={t('error')} /></div>
      ) : subscribers.length === 0 ? (
        <div data-testid="subscribers-empty"><EmptyState variant="noData" title={t('empty')} /></div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table data-testid="subscribers-table" className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-2">{t('colEmail')}</th>
                <th scope="col" className="px-4 py-2">{t('colStatus')}</th>
                <th scope="col" className="px-4 py-2">{t('colChannel')}</th>
                <th scope="col" className="px-4 py-2">{t('colDate')}</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-4 py-2 font-mono">{s.email}</td>
                  <td className="px-4 py-2"><Badge variant={SUBSCRIBER_STATUS_VARIANT[s.status] ?? 'default'}>{t(`status.${s.status}`)}</Badge></td>
                  <td className="px-4 py-2 text-muted-foreground">{s.channel ?? '—'}</td>
                  <td className="px-4 py-2 text-muted-foreground">{s.createdAt.toISOString().slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
