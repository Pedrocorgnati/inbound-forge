'use client'

/**
 * ScoringPhaseBadge — exibe fase atual do scoring (PRE_LTR / POST_LTR).
 * Intake Review TASK-6 ST004 (CL-096).
 */
import { useEffect, useState } from 'react'

interface Snapshot {
  phase: 'PRE_LTR' | 'POST_LTR'
  postsCount: number
  conversionsCount: number
  postsRemaining: number
  conversionsRemaining: number
  thresholds: { posts: number; conversions: number }
}

export function ScoringPhaseBadge() {
  const [data, setData] = useState<Snapshot | null>(null)

  useEffect(() => {
    let cancel = false
    ;(async () => {
      try {
        const res = await fetch('/api/v1/scoring/phase', { credentials: 'include' })
        if (!res.ok) return
        const json = await res.json()
        if (!cancel) setData(json.data ?? json)
      } catch {
        /* silencioso */
      }
    })()
    return () => {
      cancel = true
    }
  }, [])

  if (!data) return null

  const isPost = data.phase === 'POST_LTR'
  const color = isPost ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'

  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${color}`}>
      <span className="font-medium">Scoring: {isPost ? 'POST-LTR' : 'PRE-LTR'}</span>
      {!isPost && (
        <span className="text-muted-foreground">
          Posts {data.postsCount}/{data.thresholds.posts} · Conv {data.conversionsCount}/{data.thresholds.conversions}
        </span>
      )}
    </div>
  )
}

export default ScoringPhaseBadge
