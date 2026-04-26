'use client'

/**
 * IntegrationsStatusPanel — Inbound Forge
 * TASK-4 ST003 / CL-235, CL-236
 *
 * Painel que exibe status de Supabase e Redis a partir de /api/health/integrations.
 * Exibe badge por servico: ok (verde) | degraded (amarelo) | down (vermelho).
 */
import { useEffect, useState } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ServiceStatus = 'ok' | 'degraded' | 'down'

interface IntegrationsHealth {
  supabase: ServiceStatus
  redis: ServiceStatus
  timestamp: string
}

function StatusIcon({ status }: { status: ServiceStatus }) {
  if (status === 'ok') return <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
  if (status === 'degraded') return <AlertTriangle className="h-4 w-4 text-warning" aria-hidden />
  return <XCircle className="h-4 w-4 text-danger" aria-hidden />
}

function statusLabel(s: ServiceStatus): string {
  return s === 'ok' ? 'Operacional' : s === 'degraded' ? 'Degradado' : 'Indisponivel'
}

export function IntegrationsStatusPanel() {
  const [data, setData] = useState<IntegrationsHealth | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/health/integrations')
      if (!res.ok) throw new Error()
      setData(await res.json())
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const services: Array<{ key: keyof Omit<IntegrationsHealth, 'timestamp'>; label: string }> = [
    { key: 'supabase', label: 'Supabase' },
    { key: 'redis', label: 'Redis (Upstash)' },
  ]

  return (
    <div className="rounded-lg border border-border bg-surface p-4" data-testid="integrations-status-panel">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Integracoes externas</h3>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading} aria-label="Atualizar status">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden />
        </Button>
      </div>

      {loading && !data ? (
        <p className="text-sm text-muted-foreground">Verificando...</p>
      ) : !data ? (
        <p className="text-sm text-danger">Nao foi possivel verificar o status das integracoes.</p>
      ) : (
        <div className="space-y-2">
          {services.map(({ key, label }) => {
            const status = data[key] as ServiceStatus
            return (
              <div key={key} className="flex items-center gap-2" data-testid={`integration-${key}`}>
                <StatusIcon status={status} />
                <span className="text-sm text-foreground">{label}</span>
                <span
                  className={`ml-auto text-xs font-medium ${
                    status === 'ok'
                      ? 'text-success'
                      : status === 'degraded'
                      ? 'text-warning'
                      : 'text-danger'
                  }`}
                >
                  {statusLabel(status)}
                </span>
              </div>
            )
          })}
          <p className="mt-2 text-xs text-muted-foreground/60">
            Atualizado: {new Date(data.timestamp).toLocaleTimeString('pt-BR')}
          </p>
        </div>
      )}
    </div>
  )
}
