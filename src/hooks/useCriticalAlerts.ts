'use client'

// TASK-3 ST003 — Hook que consulta alertas criticos nao reconhecidos
// Rastreabilidade: CL-091

import { useEffect, useState } from 'react'
import type { AlertLogEntry } from '@/types/health'

const POLL_INTERVAL_MS = 60_000

export function useCriticalAlerts() {
  const [criticalAlerts, setCriticalAlerts] = useState<AlertLogEntry[]>([])

  useEffect(() => {
    let mounted = true

    async function fetchAlerts() {
      try {
        const res = await fetch('/api/v1/health/alerts?resolved=false')
        if (!res.ok) return
        const json: AlertLogEntry[] = await res.json()
        if (!mounted) return
        setCriticalAlerts(
          json.filter((a) => a.severity === 'critical' || a.severity === 'error')
        )
      } catch {
        // silent
      }
    }

    fetchAlerts()
    const id = setInterval(fetchAlerts, POLL_INTERVAL_MS)
    return () => {
      mounted = false
      clearInterval(id)
    }
  }, [])

  return { criticalAlerts, hasCritical: criticalAlerts.length > 0 }
}
