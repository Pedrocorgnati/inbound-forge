'use client'

// useReconciliationStats — stats de reconciliação para badge do sidebar
// INT-106 | PERF-002: cache via TTL local

import { useEffect, useState } from 'react'

interface ReconciliationStats {
  pendingCount: number
}

const POLL_INTERVAL_MS = 5 * 60 * 1000 // 5 minutos

export function useReconciliationStats(): ReconciliationStats {
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function fetch_() {
      try {
        const res = await fetch('/api/v1/reconciliation?resolved=false&page=1&limit=1')
        if (!res.ok || cancelled) return
        const json = await res.json()
        if (!cancelled) setPendingCount(json.meta?.total ?? 0)
      } catch {
        // silencioso — badge é informativo
      }
    }

    fetch_()
    const interval = setInterval(fetch_, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return { pendingCount }
}
