import { headers } from 'next/headers'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { Toaster } from 'sonner'
import { SUPPORTED_LOCALES } from '@/types'
import { LangUpdater } from '@/components/layout/LangUpdater'
import { ThemeProvider } from '@/components/shared/ThemeProvider'
import { WebVitalsInit } from '@/components/shared/WebVitalsInit'
import { NetworkStatusBanner } from '@/components/ux/NetworkStatusBanner'
import { OfflineBanner } from '@/components/layout/OfflineBanner'

interface LocaleLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }))
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params
  const messages = await getMessages()
  // TASK-4/ST002: ler nonce do middleware para propagar ao layout (SEC-003)
  const headersList = await headers()
  const nonce = headersList.get('x-nonce') ?? undefined

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ThemeProvider defaultTheme="system">
        <LangUpdater locale={locale} />
        <WebVitalsInit />
        <div lang={locale} data-nonce={nonce}>
          <OfflineBanner />
          <NetworkStatusBanner />
          {children}
          <Toaster position="top-right" richColors />
        </div>
      </ThemeProvider>
    </NextIntlClientProvider>
  )
}
