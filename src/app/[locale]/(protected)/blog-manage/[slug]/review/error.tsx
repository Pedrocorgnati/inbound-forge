'use client'

import { RouteErrorState } from '@/components/app-states/RouteErrorState'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  return (
    <RouteErrorState
      error={error}
      reset={reset}
      title="Erro ao carregar revisão do artigo"
      description="Nao foi possivel carregar este segmento. Tente novamente ou fale com suporte informando o correlation_id."
      boundary="blog-manage-[slug]-review-error"
      backHref="/blog-manage"
    />
  )
}
