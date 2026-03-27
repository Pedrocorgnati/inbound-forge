import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import dynamic from 'next/dynamic'
import { Toaster } from '@/components/ui/toast'
import './globals.css'

// Camada 2: import dinâmico — tree-shakeable, zero bundle em produção
const DevDataTestOverlay = dynamic(
  () => import('@/components/dev/DataTestOverlay').then((mod) => mod.DevDataTestOverlay),
  { ssr: false }
)

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
}

export const metadata: Metadata = {
  title: {
    default: 'Inbound Forge',
    template: '%s | Inbound Forge',
  },
  description: 'Ferramenta pessoal de inbound marketing automatizado',
  icons: {
    icon: '/images/favicon.ico',
    apple: '/images/apple-icon.png',
  },
  robots: 'noindex, nofollow',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        {/* Camada 3: condicional de ambiente — eliminado pelo bundler em produção */}
        {process.env.NODE_ENV === 'development' && <DevDataTestOverlay />}
        <Toaster />
      </body>
    </html>
  )
}
