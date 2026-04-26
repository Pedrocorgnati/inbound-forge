'use client'

// TASK-1 ST002 (CL-027): Tour guiado passo-a-passo para o primeiro uso do onboarding.
// Implementacao sem dependencia externa — usa Radix Dialog + backdrop com anchor
// via data-tour-step para apontar para elementos reais do OnboardingWizard.

import { useCallback, useEffect, useMemo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useTranslations } from 'next-intl'
import { ArrowLeft, ArrowRight, X, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { STORAGE_KEYS } from '@/constants/storage-keys'

const TOUR_STORAGE_KEY = `${STORAGE_KEYS.ONBOARDING}:tour_done`

interface TourStep {
  id: string
  titleKey: string
  bodyKey: string
  anchor?: string
}

const DEFAULT_STEPS: TourStep[] = [
  { id: 'welcome', titleKey: 'tour.welcome.title', bodyKey: 'tour.welcome.body' },
  { id: 'cases', titleKey: 'tour.cases.title', bodyKey: 'tour.cases.body', anchor: 'cases' },
  { id: 'pains', titleKey: 'tour.pains.title', bodyKey: 'tour.pains.body', anchor: 'pains' },
  {
    id: 'objections',
    titleKey: 'tour.objections.title',
    bodyKey: 'tour.objections.body',
    anchor: 'objections',
  },
  {
    id: 'patterns',
    titleKey: 'tour.patterns.title',
    bodyKey: 'tour.patterns.body',
    anchor: 'patterns',
  },
  { id: 'done', titleKey: 'tour.done.title', bodyKey: 'tour.done.body' },
]

function loadTourDone(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(TOUR_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function persistTourDone() {
  try {
    localStorage.setItem(TOUR_STORAGE_KEY, '1')
  } catch {
    /* quota exceeded */
  }
}

interface GuidedTourProps {
  autoStart?: boolean
  onFinish?: () => void
}

export function GuidedTour({ autoStart = true, onFinish }: GuidedTourProps) {
  const t = useTranslations('onboarding')
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const steps = useMemo(() => DEFAULT_STEPS, [])

  useEffect(() => {
    if (!autoStart) return
    const done = loadTourDone()
    if (!done) setOpen(true)
  }, [autoStart])

  const close = useCallback(() => {
    setOpen(false)
    persistTourDone()
    onFinish?.()
  }, [onFinish])

  const goNext = useCallback(() => {
    setIndex((prev) => {
      if (prev >= steps.length - 1) {
        close()
        return prev
      }
      return prev + 1
    })
  }, [steps.length, close])

  const goPrev = useCallback(() => setIndex((prev) => Math.max(prev - 1, 0)), [])

  const step = steps[index]
  const isLast = index === steps.length - 1

  return (
    <>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay
            className={cn(
              'fixed inset-0 z-40 bg-black/50 backdrop-blur-sm',
              'data-[state=open]:animate-in data-[state=closed]:animate-out'
            )}
          />
          <Dialog.Content
            data-testid="guided-tour-dialog"
            className={cn(
              'fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2',
              'rounded-lg bg-background p-6 shadow-xl focus:outline-none'
            )}
          >
            <Dialog.Title className="text-lg font-semibold">{t(step.titleKey)}</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-muted-foreground">
              {t(step.bodyKey)}
            </Dialog.Description>

            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {index + 1} / {steps.length}
              </span>
              <button
                type="button"
                onClick={close}
                className="underline underline-offset-2 hover:text-foreground"
              >
                {t('tour.skip')}
              </button>
            </div>

            <div className="mt-4 flex justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={goPrev}
                disabled={index === 0}
                aria-label={t('tour.back')}
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                {t('tour.back')}
              </Button>
              <Button size="sm" onClick={goNext}>
                {isLast ? t('tour.finish') : t('tour.next')}
                {!isLast && <ArrowRight className="ml-1 h-4 w-4" />}
              </Button>
            </div>

            <Dialog.Close
              asChild
              className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:text-foreground"
            >
              <button type="button" aria-label={t('tour.close')}>
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}

export function GuidedTourTrigger() {
  const t = useTranslations('onboarding')
  const reopenTour = () => {
    try {
      localStorage.removeItem(TOUR_STORAGE_KEY)
    } catch {
      /* ignore */
    }
    window.location.reload()
  }
  return (
    <button
      type="button"
      onClick={reopenTour}
      aria-label={t('tour.reopen')}
      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
    >
      <HelpCircle className="h-3.5 w-3.5" />
      {t('tour.reopen')}
    </button>
  )
}
