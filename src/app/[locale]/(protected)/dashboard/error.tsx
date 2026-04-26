'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { captureException } from '@/lib/sentry'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function DashboardError({ error, reset }: ErrorProps) {
  const pathname = usePathname()

  useEffect(() => {
    captureException(error, { digest: error.digest, route: pathname, boundary: 'dashboard-error' })
  }, [error, pathname])

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
      <p className="text-6xl font-bold text-danger/20">500</p>
      <h2 className="text-xl font-semibold text-foreground">Erro ao carregar o Dashboard</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        Não foi possível carregar seus dados. Tente novamente ou volte mais tarde.
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground/60">Código: {error.digest}</p>
      )}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
        >
          Tentar novamente
        </button>
        <Link
          href="."
          className="inline-flex items-center justify-center rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
        >
          Recarregar
        </Link>
      </div>
    </div>
  )
}
