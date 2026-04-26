'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { formatDateRelative } from '@/lib/utils'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle, AlertCircle, Info, XCircle, CheckCircle } from 'lucide-react'
import type { AlertLogEntry } from '@/types/health'

const SEVERITY_ICON: Record<AlertLogEntry['severity'], React.ElementType> = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  critical: XCircle,
}

const SEVERITY_COLOR: Record<AlertLogEntry['severity'], string> = {
  info: 'text-[#1E40AF]',
  warning: 'text-warning',
  error: 'text-danger',
  critical: 'text-danger',
}

export function AlertLogPanel() {
  const [alerts, setAlerts] = useState<AlertLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [resolvingIds, setResolvingIds] = useState<Set<string>>(new Set())
  const searchParams = useSearchParams()

  // Intake-Review G3 (CL-DX-027): consome filtros type/severity/resolved da URL.
  const filterQs = (() => {
    const q = new URLSearchParams()
    const resolved = searchParams.get('resolved') ?? 'false'
    q.set('resolved', resolved)
    const type = searchParams.get('type')
    if (type) q.set('type', type)
    const severity = searchParams.get('severity')
    if (severity) q.set('severity', severity)
    return q.toString()
  })()

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/v1/health/alerts?${filterQs}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      // route retorna okPaginated { success, data, pagination }
      const items: AlertLogEntry[] = Array.isArray(json) ? json : (json.data ?? [])
      setAlerts(items)
    } catch {
      // silencioso na carga
    } finally {
      setIsLoading(false)
    }
  }, [filterQs])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  async function handleResolve(id: string) {
    // Optimistic update
    setAlerts((prev) => prev.filter((a) => a.id !== id))
    setResolvingIds((prev) => new Set(prev).add(id))

    try {
      const res = await fetch(`/api/v1/health/alerts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: true }),
      })
      if (!res.ok) throw new Error()
      toast.success('Alerta resolvido')
    } catch {
      // Rollback
      fetchAlerts()
      toast.error('Erro ao resolver alerta')
    } finally {
      setResolvingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  return (
    <Card data-testid="alert-log-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-warning" />
          Alertas Pendentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton variant="rectangle" className="h-14 w-full" />
            <Skeleton variant="rectangle" className="h-14 w-full" />
            <Skeleton variant="rectangle" className="h-14 w-full" />
          </div>
        ) : alerts.length === 0 ? (
          <div
            data-testid="alert-log-empty"
            className="flex flex-col items-center gap-2 py-8 text-muted-foreground"
          >
            <CheckCircle className="h-8 w-8 text-success" />
            <p className="text-sm">Nenhum alerta pendente</p>
          </div>
        ) : (
          <ul className="space-y-2" role="list">
            {alerts.map((alert) => {
              const Icon = SEVERITY_ICON[alert.severity]
              return (
                <li
                  key={alert.id}
                  data-testid={`alert-item-${alert.id}`}
                  className="flex items-start gap-3 rounded-md border border-border p-3"
                >
                  <Icon
                    className={cn('mt-0.5 h-4 w-4 shrink-0', SEVERITY_COLOR[alert.severity])}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{alert.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {alert.service} &middot; {formatDateRelative(new Date(alert.occurredAt))}
                    </p>
                  </div>
                  <Button
                    data-testid={`alert-resolve-${alert.id}`}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleResolve(alert.id)}
                    disabled={resolvingIds.has(alert.id)}
                    className="shrink-0 text-xs"
                  >
                    Resolver
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
