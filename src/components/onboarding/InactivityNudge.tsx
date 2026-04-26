'use client'

// TASK-1 ST004 (CL-029): nudge via sonner.toast() quando operator fica inativo
// por 45s dentro de /onboarding. So atua se prop `enabled` for true (o layout
// de onboarding liga, os demais layouts nao).

import { useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { useInactivityTimer } from '@/hooks/useInactivityTimer'

interface InactivityNudgeProps {
  enabled?: boolean
  idleMs?: number
}

export function InactivityNudge({ enabled = true, idleMs = 45_000 }: InactivityNudgeProps) {
  const t = useTranslations('onboarding.nudge')
  const firedRef = useRef(false)

  const onIdle = useCallback(() => {
    if (firedRef.current) return
    firedRef.current = true
    toast(t('title'), {
      description: t('description'),
      duration: 10_000,
      action: {
        label: t('cta'),
        onClick: () => {
          const el = document.querySelector('[data-testid="examples-carousel"]')
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        },
      },
      onAutoClose: () => {
        firedRef.current = false
      },
      onDismiss: () => {
        firedRef.current = false
      },
    })
  }, [t])

  useInactivityTimer(idleMs, onIdle, { enabled })

  return null
}
