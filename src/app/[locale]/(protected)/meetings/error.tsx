'use client'

import { RouteErrorState } from '@/components/app-states/RouteErrorState'

export default function MeetingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <RouteErrorState
      error={error}
      reset={reset}
      title="Não foi possível abrir reuniões"
      description="As reuniões Cal.com não puderam ser carregadas. Tente novamente ou acione o suporte."
      boundary="meetings-page"
    />
  )
}
