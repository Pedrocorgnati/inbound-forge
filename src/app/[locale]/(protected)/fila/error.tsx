'use client'

import { useTranslations } from 'next-intl'
import { RouteErrorState } from '@/components/app-states/RouteErrorState'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  const t = useTranslations('queue')

  return (
    <RouteErrorState
      error={error}
      reset={reset}
      title={t('errorTitle')}
      description={t('errorDescription')}
      boundary="fila-error"
      backHref="/fila"
    />
  )
}
