'use client'

// OnboardingResumeCard — reentra no onboarding quando incompleto (TASK-12 ST004 / CL-022)

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface ProgressResponse {
  progressPct: number
  currentStep?: string | null
  completedSteps?: string[]
  totalSteps?: number
}

export function OnboardingResumeCard({ locale }: { locale: string }) {
  const [data, setData] = useState<ProgressResponse | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/v1/onboarding/progress', { credentials: 'include' })
        if (!res.ok) {
          if (!cancelled) setFailed(true)
          return
        }
        const json = (await res.json().catch(() => null)) as
          | { data?: ProgressResponse }
          | ProgressResponse
          | null
        const payload = (json && 'data' in (json as object) ? (json as { data: ProgressResponse }).data : (json as ProgressResponse | null))
        if (!cancelled && payload) setData(payload)
      } catch {
        if (!cancelled) setFailed(true)
      }
    }
    void load()
    const retry = failed ? window.setTimeout(() => void load(), 30_000) : undefined
    return () => {
      cancelled = true
      if (retry) window.clearTimeout(retry)
    }
  }, [failed])

  if (!data || data.progressPct >= 100) return null

  const step = data.currentStep ?? 'welcome'
  return (
    <section
      data-testid="onboarding-resume-card"
      className="mb-4 rounded-lg border border-border bg-background p-4 shadow-sm"
    >
      <header className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold">Continuar onboarding</h2>
        <span className="text-xs text-muted-foreground">{Math.round(data.progressPct)}%</span>
      </header>
      <div className="mb-3 h-2 w-full rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-primary transition-all"
          style={{ width: `${Math.round(data.progressPct)}%` }}
          aria-hidden="true"
        />
      </div>
      <p className="mb-3 text-sm text-muted-foreground">
        Voce esta no passo <strong>{step}</strong>. Conclua para liberar o pipeline completo.
      </p>
      <Link
        href={`/${locale}/onboarding/${step}`}
        className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Continuar
      </Link>
    </section>
  )
}
