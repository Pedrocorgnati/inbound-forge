'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLocale } from 'next-intl'
import { AlertTriangle, RotateCcw, LifeBuoy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { captureException } from '@/lib/sentry'

interface RouteErrorStateProps {
  error: Error & { digest?: string }
  reset: () => void
  title: string
  description: string
  boundary: string
  supportHref?: string
  backHref?: string
  backLabel?: string
}

export function RouteErrorState({
  error,
  reset,
  title,
  description,
  boundary,
  supportHref = 'mailto:suporte@inboundforge.com?subject=Erro%20no%20Inbound%20Forge',
  backHref = '/dashboard',
  backLabel = 'Voltar ao painel',
}: RouteErrorStateProps) {
  const pathname = usePathname()
  const locale = useLocale()
  const correlationId = error.digest ?? `${boundary}:${pathname}`
  const localizedBackHref = backHref.startsWith('/') ? `/${locale}${backHref}` : backHref

  useEffect(() => {
    captureException(error, {
      boundary,
      correlation_id: correlationId,
      digest: error.digest,
      route: pathname,
    })
  }, [boundary, correlationId, error, pathname])

  return (
    <section
      className="mx-auto flex min-h-[420px] max-w-2xl flex-col items-center justify-center rounded-lg border border-border bg-background p-6 text-center"
      role="alert"
      aria-live="assertive"
      data-testid="route-error-state"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
        <AlertTriangle className="h-6 w-6" aria-hidden />
      </div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        correlation_id: {correlationId}
      </p>
      <h2 className="mt-2 text-xl font-semibold text-foreground">{title}</h2>
      <p className="mt-2 max-w-lg text-sm text-muted-foreground">{description}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button type="button" onClick={reset}>
          <RotateCcw className="h-4 w-4" aria-hidden />
          Tentar novamente
        </Button>
        <Button asChild variant="outline">
          <Link href={supportHref}>
            <LifeBuoy className="h-4 w-4" aria-hidden />
            Falar com suporte
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href={localizedBackHref}>{backLabel}</Link>
        </Button>
      </div>
    </section>
  )
}
