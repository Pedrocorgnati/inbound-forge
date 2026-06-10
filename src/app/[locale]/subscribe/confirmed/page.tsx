import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'subscribe' })
  return { title: t('confirmed.title') }
}

export default async function ConfirmedPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { locale } = await params
  const { error } = await searchParams
  const t = await getTranslations({ locale, namespace: 'subscribe' })
  const isError = error === '1'
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {isError ? t('error') : t('confirmed.title')}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {isError ? t('confirmed.error') : t('confirmed.message')}
      </p>
    </main>
  )
}
