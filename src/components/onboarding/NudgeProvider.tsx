'use client'

// TASK-5 ST002 — Provider que dispara nudges contextuais por inatividade.
// Rastreabilidade: CL-010

import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

export interface NudgeRule {
  /** Prefixo de rota (p.ex. "/dashboard"). Match por startsWith. */
  route: string
  /** Tempo em ms sem interacao antes de exibir o nudge. */
  idleMs: number
  /** Texto do nudge. */
  message: string
  /** Acao opcional — rota destino. */
  ctaHref?: string
  /** Rotulo do CTA. */
  ctaLabel?: string
  /** Chave estavel para dismiss persistido. */
  key: string
}

const DEFAULT_RULES: NudgeRule[] = [
  {
    key: 'dashboard-approve-first',
    route: '/dashboard',
    idleMs: 45_000,
    message: 'Aprovar um tema desbloqueia geracao de conteudo. Comece pelo tema com maior score.',
    ctaLabel: 'Ver recomendados',
    ctaHref: '/dashboard?focus=top',
  },
  {
    key: 'calendar-schedule-first',
    route: '/calendar',
    idleMs: 45_000,
    message: 'Arraste um post para uma data livre para agendar sem precisar abrir o formulario.',
  },
]

interface NudgeCtx {
  activeNudge: NudgeRule | null
  dismiss: () => void
}

const NudgeContext = createContext<NudgeCtx>({ activeNudge: null, dismiss: () => {} })

export function useNudge() {
  return useContext(NudgeContext)
}

const SESSION_KEY_PREFIX = 'nudge-dismissed:'

export function NudgeProvider({
  children,
  rules = DEFAULT_RULES,
}: {
  children: React.ReactNode
  rules?: NudgeRule[]
}) {
  const pathname = usePathname() ?? ''
  const [activeNudge, setActiveNudge] = useState<NudgeRule | null>(null)
  const lastActivityAt = useRef<number>(Date.now())
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Rule para rota atual (primeira matching).
  const currentRule = rules.find((r) => pathname.includes(r.route)) ?? null

  useEffect(() => {
    if (!currentRule) {
      setActiveNudge(null)
      return
    }
    if (typeof window === 'undefined') return
    // Ja dispensado nesta sessao?
    if (sessionStorage.getItem(SESSION_KEY_PREFIX + currentRule.key) === '1') {
      setActiveNudge(null)
      return
    }

    function bumpActivity() {
      lastActivityAt.current = Date.now()
      setActiveNudge(null)
      if (timerRef.current) clearTimeout(timerRef.current)
      schedule()
    }

    function schedule() {
      if (!currentRule) return
      timerRef.current = setTimeout(() => {
        setActiveNudge(currentRule)
      }, currentRule.idleMs)
    }

    const events: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'click', 'scroll']
    events.forEach((e) => window.addEventListener(e, bumpActivity, { passive: true }))
    schedule()

    return () => {
      events.forEach((e) => window.removeEventListener(e, bumpActivity))
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [currentRule])

  function dismiss() {
    if (!activeNudge) return
    try {
      sessionStorage.setItem(SESSION_KEY_PREFIX + activeNudge.key, '1')
    } catch {
      // storage indisponivel — apenas fecha na sessao
    }
    setActiveNudge(null)
  }

  return (
    <NudgeContext.Provider value={{ activeNudge, dismiss }}>
      {children}
    </NudgeContext.Provider>
  )
}
