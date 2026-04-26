import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { WebVitalsReporter } from '@/components/analytics/WebVitalsReporter'
// Camada 2: Client Component wrapper — ssr:false requer Client Component no Next.js 15+
import { DevDataTestOverlayClient } from '@/components/dev/DevDataTestOverlayClient'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

// RESOLVED: viewport export ausente (G008)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)', color: '#0F172A' },
  ],
}

export const metadata: Metadata = {
  title: {
    default: 'Inbound Forge',
    template: '%s | Inbound Forge',
  },
  description: 'Ferramenta pessoal de inbound marketing automatizado',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' }, // RESOLVED: G08 — placeholder SVG com iniciais IF
      { url: '/images/logo-symbol.svg' },
    ],
    // PENDING-ACTIONS: gerar apple-icon.png 180×180px e adicionar em public/images/
  },
  robots: 'noindex, nofollow',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Inbound Forge',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <WebVitalsReporter />
        {/* Camada 3: condicional de ambiente — eliminado pelo bundler em produção */}
        {process.env.NODE_ENV === 'development' && <DevDataTestOverlayClient />}
      </body>
    </html>
  )
}
