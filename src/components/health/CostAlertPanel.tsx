'use client'

// TASK-3 ST002 — Painel de alertas de custo com acao de reconhecer
// Rastreabilidade: CL-091
// Observacao: reutiliza /api/v1/health/alerts PATCH existente (ack = resolved=true).

import React, { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, CheckCircle, DollarSign } from 'lucide-react'
import type { AlertLogEntry } from '@/types/health'

const COST_SERVICES = ['claude', 'ideogram', 'flux', 'instagram']

export function CostAlertPanel() {
  const [alerts, setAlerts] = useState<AlertLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [acking, setAcking] = useState<Set<string>>(new Set())

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/health/alerts?resolved=false')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: AlertLogEntry[] = await res.json()
      setAlerts(
        json.filter((a) => COST_SERVICES.some((s) => a.service.toLowerCase().includes(s)))
      )
    } catch {
      // silencioso
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  async function handleAck(id: string) {
    setAlerts((prev) => prev.filter((a) => a.id !== id))
    setAcking((prev) => new Set(prev).add(id))
    try {
      const res = await fetch(`/api/v1/health/alerts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: true, ackedAt: new Date().toISOString() }),
      })
      if (!res.ok) throw new Error()
      toast.success('Alerta reconhecido')
    } catch {
      toast.error('Erro ao reconhecer alerta')
      fetchAlerts()
    } finally {
      setAcking((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  return (
    <Card data-testid="cost-alert-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-4 w-4 text-warning" />
          Alertas de Custo
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton variant="rectangle" className="h-14 w-full" />
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <CheckCircle className="h-6 w-6 text-success" />
            <p className="text-xs">Sem alertas de custo pendentes</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {alerts.map((a) => (
              <li
                key={a.id}
                data-testid={`cost-alert-${a.id}`}
                className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-3"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{a.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.service} &middot; {new Date(a.occurredAt).toLocaleString('pt-BR')}
                  </p>
                </div>
                <Button
                  data-testid={`cost-alert-ack-${a.id}`}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAck(a.id)}
                  disabled={acking.has(a.id)}
                  className="shrink-0 text-xs"
                >
                  Reconhecer
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
