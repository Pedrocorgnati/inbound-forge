'use client'

// TASK-1 ST003 (CL-028): carousel de exemplos de cases/dores exibidos na entrada
// do onboarding. Auto-rotate 6s com pause on hover; conteudo vem de next-intl
// (nao persiste em DB).

import { useCallback, useEffect, useRef, useState } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

const SLIDE_IDS = ['saas-churn', 'ecom-leads', 'b2b-discovery'] as const
const ROTATE_MS = 6000

export function ExamplesCarousel() {
  const t = useTranslations('onboarding.examples')
  const [active, setActive] = useState<string>(SLIDE_IDS[0])
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const advance = useCallback(() => {
    setActive((prev) => {
      const idx = SLIDE_IDS.indexOf(prev as (typeof SLIDE_IDS)[number])
      const next = (idx + 1) % SLIDE_IDS.length
      return SLIDE_IDS[next]
    })
  }, [])

  useEffect(() => {
    if (paused) {
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = null
      return
    }
    timerRef.current = setInterval(advance, ROTATE_MS)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [paused, advance])

  return (
    <div
      data-testid="examples-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="rounded-lg border border-border bg-card p-4"
    >
      <h3 className="text-sm font-semibold text-foreground">{t('heading')}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{t('subheading')}</p>

      <Tabs.Root value={active} onValueChange={setActive} className="mt-3">
        <Tabs.List aria-label={t('tablistLabel')} className="flex gap-1">
          {SLIDE_IDS.map((id) => (
            <Tabs.Trigger
              key={id}
              value={id}
              className={cn(
                'h-1.5 flex-1 rounded-full bg-muted transition-colors',
                'data-[state=active]:bg-primary',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
              )}
              aria-label={t(`${id}.title`)}
            />
          ))}
        </Tabs.List>

        {SLIDE_IDS.map((id) => (
          <Tabs.Content key={id} value={id} className="mt-3 focus:outline-none">
            <div className="rounded-md bg-muted/40 p-3">
              <h4 className="text-sm font-medium text-foreground">{t(`${id}.title`)}</h4>
              <p className="mt-1 text-xs text-muted-foreground">{t(`${id}.problem`)}</p>
              <p className="mt-2 text-xs text-foreground">{t(`${id}.solution`)}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {t(`${id}.stack`)
                  .split(',')
                  .map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {tag.trim()}
                    </span>
                  ))}
              </div>
            </div>
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </div>
  )
}
