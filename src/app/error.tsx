'use client'

import { RouteErrorState } from '@/components/app-states/RouteErrorState'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function RootError({ error, reset }: ErrorProps) {
  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <RouteErrorState
        error={error}
        reset={reset}
        title="Algo deu errado"
        description="Ocorreu um erro inesperado. Tente novamente ou fale com suporte informando o correlation_id."
        boundary="root-error"
        backHref="/"
        backLabel="Voltar ao inicio"
      />
    </main>
  )
}
