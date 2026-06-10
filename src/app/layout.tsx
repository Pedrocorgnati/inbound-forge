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
  // Resolve URLs relativas de OG/Twitter (sem isto o next build avisa e usa
  // http://localhost:3000, quebrando os social cards em producao). Usa o mesmo
  // NEXT_PUBLIC_BASE_URL que as paginas de blog/sitemap ja consomem.
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Inbound Forge',
    template: '%s | Inbound Forge',
  },
  description: 'Ferramenta pessoal de inbound marketing automatizado',
  openGraph: {
    images: [{ url: '/images/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/images/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' }, // fallback
      { url: '/images/logo-symbol.png' },
    ],
    apple: [{ url: '/images/apple-icon.png', sizes: '180x180', type: 'image/png' }],
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
