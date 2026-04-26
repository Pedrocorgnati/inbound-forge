'use client'

// TASK-1 ST005 (CL-030): banner sticky no topo de (protected) quando o seed
// minimo (5 cases + 5 pains) ainda nao foi atingido. Dismissable por 24h via
// localStorage com TTL.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STORAGE_KEYS } from '@/constants/storage-keys'

const DISMISS_KEY = `${STORAGE_KEYS.ONBOARDING}:banner_dismissed_until`
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000

interface SeedIncompleteBannerProps {
  casesCount: number
  painsCount: number
  locale: string
  activated?: boolean
}

export function SeedIncompleteBanner({
  casesCount,
  painsCount,
  locale,
  activated,
}: SeedIncompleteBannerProps) {
  const t = useTranslations('onboarding.banner')
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    if (activated) {
      setDismissed(true)
      return
    }
    try {
      const raw = localStorage.getItem(DISMISS_KEY)
      if (raw) {
        const until = parseInt(raw, 10)
        if (Number.isFinite(until) && until > Date.now()) {
          setDismissed(true)
          return
        }
      }
    } catch {
      /* ignore */
    }
    setDismissed(false)
  }, [activated])

  const complete = casesCount >= 5 && painsCount >= 5
  if (dismissed || activated || complete) return null

  const targetStep = casesCount < 5 ? 'cases' : 'pains'
  const href = `/${locale}/onboarding?step=${targetStep}`

  const onDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_TTL_MS))
    } catch {
      /* ignore */
    }
    setDismissed(true)
  }

  return (
    <div
      data-testid="seed-incomplete-banner"
      role="status"
      className={cn(
        'sticky top-0 z-30 flex items-center gap-3 border-b border-amber-500/30',
        'bg-amber-500/10 px-4 py-2 text-sm text-amber-900 dark:text-amber-100'
      )}
    >
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <div className="flex-1">
        <span className="font-medium">{t('title')}</span>{' '}
        <span>
          {t('progress', {
            cases: casesCount,
            casesTarget: 5,
            pains: painsCount,
            painsTarget: 5,
          })}
        </span>
      </div>
      <Link
        href={href}
        className="rounded-md bg-amber-500 px-3 py-1 text-xs font-medium text-amber-950 hover:bg-amber-600"
      >
        {t('cta')}
      </Link>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t('dismiss')}
        className="rounded-full p-1 text-amber-900 hover:bg-amber-500/20 dark:text-amber-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
