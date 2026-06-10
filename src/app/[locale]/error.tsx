'use client'

import { RouteErrorState } from '@/components/app-states/RouteErrorState'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  return (
    <main className="min-h-dvh bg-background px-4 py-12">
      <RouteErrorState
        error={error}
        reset={reset}
        title="Algo deu errado"
        description="Nao foi possivel carregar esta pagina. Tente novamente ou fale com suporte informando o correlation_id."
        boundary="locale-error"
        backHref="/dashboard"
        backLabel="Voltar ao painel"
      />
    </main>
  )
}
