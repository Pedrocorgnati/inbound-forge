'use client'

/**
 * IntegrationErrorState — Inbound Forge
 * TASK-4 ST003 / CL-235
 *
 * Renderizado por error boundaries quando `IntegrationError` e capturado.
 * Exibe feedback claro + botao "Tentar novamente" (Zero Silencio).
 */
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  service?: string
  code?: string
  onRetry?: () => void
}

export function IntegrationErrorState({ service, code, onRetry }: Props) {
  const serviceLabel = service ?? 'servico externo'

  return (
    <div
      className="flex flex-col items-center gap-4 rounded-lg border border-warning/30 bg-warning/5 px-6 py-8 text-center"
      role="alert"
      data-testid="integration-error-state"
    >
      <AlertTriangle className="h-10 w-10 text-warning" aria-hidden />
      <div className="space-y-1">
        <p className="font-semibold text-foreground">
          {serviceLabel} temporariamente indisponivel
        </p>
        <p className="text-sm text-muted-foreground">
          O sistema esta tentando reconectar automaticamente. Voce pode tentar novamente agora ou aguardar.
        </p>
        {code && (
          <p className="text-xs text-muted-foreground/60">
            Codigo: {code}
          </p>
        )}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" aria-hidden />
          Tentar novamente
        </Button>
      )}
    </div>
  )
}
