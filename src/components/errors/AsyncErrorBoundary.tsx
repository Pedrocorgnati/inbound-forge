'use client'
/**
 * AsyncErrorBoundary — captura promise rejections e erros globais client-side.
 * TASK-14 ST003 (CL-T14)
 *
 * Adicionar no RootLayout ou client provider root.
 * Envia para Sentry + exibe fallback UI se erro crítico.
 */
import { useEffect, useState } from 'react'

interface AsyncError {
  message: string
  source: 'unhandledrejection' | 'error'
}

export function AsyncErrorBoundary({ children }: { children: React.ReactNode }) {
  const [asyncError, setAsyncError] = useState<AsyncError | null>(null)

  useEffect(() => {
    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      const message =
        event.reason instanceof Error
          ? event.reason.message
          : String(event.reason ?? 'Promise rejection sem detalhes')

      // Enviar para Sentry se disponível
      if (typeof window !== 'undefined' && (window as unknown as { Sentry?: { captureException: (e: unknown) => void } }).Sentry) {
        const sentry = (window as unknown as { Sentry: { captureException: (e: unknown) => void } }).Sentry
        sentry.captureException(event.reason)
      }

      // Só exibir UI de erro para erros críticos (não de rede temporários)
      const isCritical = !(message.includes('fetch') || message.includes('network') || message.includes('NetworkError'))
      if (isCritical) {
        setAsyncError({ message, source: 'unhandledrejection' })
      }

      event.preventDefault()
    }

    function handleError(event: ErrorEvent) {
      const message = event.error?.message ?? event.message ?? 'Erro desconhecido'

      if (typeof window !== 'undefined' && (window as unknown as { Sentry?: { captureException: (e: unknown) => void } }).Sentry) {
        const sentry = (window as unknown as { Sentry: { captureException: (e: unknown) => void } }).Sentry
        sentry.captureException(event.error)
      }

      setAsyncError({ message, source: 'error' })
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleError)

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleError)
    }
  }, [])

  if (asyncError) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/90 p-6"
      >
        <div className="max-w-md rounded-lg border border-destructive bg-card p-6 shadow-lg">
          <h2 className="mb-2 text-lg font-semibold text-destructive">Erro inesperado</h2>
          <p className="mb-4 text-sm text-muted-foreground">{asyncError.message}</p>
          <button
            className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            onClick={() => {
              setAsyncError(null)
              window.location.reload()
            }}
          >
            Recarregar página
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
