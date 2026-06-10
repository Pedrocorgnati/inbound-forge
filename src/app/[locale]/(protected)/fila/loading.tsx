'use client'

import { useTranslations } from 'next-intl'
import { RouteLoadingState } from '@/components/app-states/RouteLoadingState'

export default function Loading() {
  const t = useTranslations('queue')

  return <RouteLoadingState title={t('loadingTitle')} description={t('loadingDescription')} />
}
