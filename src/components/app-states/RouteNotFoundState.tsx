'use client'

import Link from 'next/link'
import { useLocale } from 'next-intl'
import { FileQuestion, LifeBuoy } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RouteNotFoundStateProps {
  title: string
  description: string
  backHref: string
  backLabel: string
  supportHref?: string
}

export function RouteNotFoundState({
  title,
  description,
  backHref,
  backLabel,
  supportHref = 'mailto:suporte@inboundforge.com?subject=Pagina%20nao%20encontrada',
}: RouteNotFoundStateProps) {
  const locale = useLocale()
  const localizedBackHref = backHref.startsWith('/') ? `/${locale}${backHref}` : backHref

  return (
    <section
      className="mx-auto flex min-h-[420px] max-w-2xl flex-col items-center justify-center rounded-lg border border-border bg-background p-6 text-center"
      data-testid="route-not-found-state"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <FileQuestion className="h-6 w-6" aria-hidden />
      </div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">404</p>
      <h1 className="mt-2 text-xl font-semibold text-foreground">{title}</h1>
      <p className="mt-2 max-w-lg text-sm text-muted-foreground">{description}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href={localizedBackHref}>{backLabel}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={supportHref}>
            <LifeBuoy className="h-4 w-4" aria-hidden />
            Falar com suporte
          </Link>
        </Button>
      </div>
    </section>
  )
}
