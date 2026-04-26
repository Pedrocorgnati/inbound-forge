'use client'

// KnowledgeQualityBanner — proativo quando KB abaixo dos thresholds (TASK-12 ST003 / CL-036)

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Deficits {
  cases: number
  pains: number
  patterns: number
  objections: number
}

interface Response {
  deficits: Deficits
  counts: Deficits
  thresholds: Deficits
  healthy: boolean
}

const DISMISS_KEY = 'kb-quality-banner-dismissed-until'

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    if (!raw) return false
    const until = parseInt(raw, 10)
    return Number.isFinite(until) && until > Date.now()
  } catch {
    return false
  }
}

function dismissFor24h() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + 24 * 60 * 60 * 1000))
  } catch {
    /* ignore */
  }
}

export function KnowledgeQualityBanner({ locale }: { locale: string }) {
  const [data, setData] = useState<Response | null>(null)
  const [dismissed, setDismissed] = useState(true) // otimista: nao mostra ate confirmar

  useEffect(() => {
    setDismissed(isDismissed())
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/v1/knowledge/quality-check', { credentials: 'include' })
        if (!res.ok) return
        const json = (await res.json().catch(() => null)) as { data?: Response } | Response | null
        const payload = (json && 'data' in json ? json.data : json) as Response | null
        if (!cancelled && payload) setData(payload)
      } catch {
        /* silencioso */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!data || data.healthy || dismissed) return null

  const issues: Array<{ label: string; href: string; deficit: number }> = []
  if (data.deficits.cases > 0)
    issues.push({
      label: `${data.deficits.cases} case${data.deficits.cases > 1 ? 's' : ''}`,
      href: `/${locale}/knowledge?tab=cases`,
      deficit: data.deficits.cases,
    })
  if (data.deficits.pains > 0)
    issues.push({
      label: `${data.deficits.pains} dor${data.deficits.pains > 1 ? 'es' : ''}`,
      href: `/${locale}/knowledge?tab=pains`,
      deficit: data.deficits.pains,
    })
  if (data.deficits.patterns > 0)
    issues.push({
      label: `${data.deficits.patterns} pattern${data.deficits.patterns > 1 ? 's' : ''}`,
      href: `/${locale}/knowledge?tab=patterns`,
      deficit: data.deficits.patterns,
    })

  if (issues.length === 0) return null

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="kb-quality-banner"
      className="flex flex-wrap items-center justify-between gap-3 border-b bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <div>
        <strong>Base de conhecimento incompleta.</strong> Faltam:{' '}
        {issues.map((i, idx) => (
          <span key={i.label}>
            <Link href={i.href} className="underline hover:text-amber-950">
              {i.label}
            </Link>
            {idx < issues.length - 1 ? ', ' : '.'}
          </span>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          dismissFor24h()
          setDismissed(true)
        }}
        className="rounded border border-amber-300 bg-white px-3 py-1 text-xs hover:bg-amber-100"
      >
        Dispensar por 24h
      </button>
    </div>
  )
}
