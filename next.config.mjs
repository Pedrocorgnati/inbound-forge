import createNextIntlPlugin from 'next-intl/plugin'
import { withSentryConfig } from '@sentry/nextjs'
import withBundleAnalyzer from '@next/bundle-analyzer'

const bundleAnalyzer = withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

// SEC-003: Security headers estáticos (CSP dinâmico com nonce é feito no middleware)
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // HSTS apenas em produção — evita bloquear HTTP em desenvolvimento
  ...(process.env.NODE_ENV === 'production'
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }]
    : []),
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  // TASK-12 (CL-229): expor versao + commit SHA ao client
  env: {
    NEXT_PUBLIC_BUILD_SHA: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev',
    NEXT_PUBLIC_BUILD_VERSION: process.env.npm_package_version ?? '0.0.0',
  },
  // Necessário para o Dockerfile multi-stage (Stage 3: runner usa .next/standalone)
  output: 'standalone',
  // SEC: não revelar que o servidor usa Next.js (A05)
  poweredByHeader: false,
  // Native modules que não devem ser bundled pelo webpack (movido de experimental em Next 15)
  serverExternalPackages: ['@resvg/resvg-js', 'sharp'],
  experimental: {
    // Tree-shake imports de pacotes pesados automaticamente
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns'],
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: securityHeaders,
    },
  ],
  images: {
    formats: ['image/avif', 'image/webp'],
    // Alinhados aos breakpoints do Tailwind (sm/md/lg/xl/2xl)
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        // Restringe ao hostname do projeto Supabase (ex: xyzproject.supabase.co)
        // Em produção, defina SUPABASE_HOSTNAME com o hostname exato do projeto.
        // O wildcard *.supabase.co é o fallback seguro para desenvolvimento.
        hostname: process.env.SUPABASE_HOSTNAME ?? '*.supabase.co',
      },
    ],
  },
}

const withIntl = withNextIntl(nextConfig)

// Sentry config — source maps em build + tunnel para ad blockers (TASK-4/ST001)
// RESOLVED: Sentry com opções deprecated (G005)
// Em dev: bypassa withSentryConfig pois ele lê prerender-manifest.json/routes-manifest.json
// que só existem após `next build`. Em produção: wrapping completo.
const isDev = process.env.NODE_ENV === 'development'

const withSentry = isDev
  ? (config) => config
  : (config) => withSentryConfig(config, {
      silent: true,
      widenClientFileUpload: true,
      tunnelRoute: '/monitoring',
      hideSourceMaps: true,
    })

export default bundleAnalyzer(withSentry(withIntl))
