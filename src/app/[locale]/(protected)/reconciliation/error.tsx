'use client'

import { RouteErrorState } from '@/components/app-states/RouteErrorState'

export default function ReconciliationError({
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
      title="Não foi possível abrir a reconciliação"
      description="Os eventos de funil não puderam ser carregados. Tente novamente ou acione o suporte."
      boundary="reconciliation-page"
    />
  )
}
