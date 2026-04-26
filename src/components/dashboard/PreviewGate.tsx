'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Lock, ArrowRight, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PreviewActivationContext } from '@/contexts/PreviewActivationContext'

interface PreviewGateProps {
  children: React.ReactNode
  isLocked: boolean
  /** CL-009: quando false, ScoreGauge fica oculto via contexto */
  isActivated?: boolean
}

export function PreviewGate({ children, isLocked, isActivated = true }: PreviewGateProps) {
  const { locale } = useParams<{ locale: string }>()

  // Bloqueio total (sem threshold de cases)
  if (isLocked) {
    return (
      <div className="relative" aria-live="polite" aria-label="Temas bloqueados">
        <div
          aria-hidden="true"
          className="pointer-events-none select-none"
          style={{ filter: 'blur(4px)' }}
        >
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="mx-auto max-w-sm rounded-xl border border-border bg-card p-6 text-center shadow-lg">
            <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
            <h3 className="mt-3 text-lg font-semibold text-foreground">
              Desbloqueie seus Temas
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Adicione pelo menos 5 cases para desbloquear a visualização completa.
            </p>
            <Button asChild className="mt-4 min-h-[44px]">
              <Link href={`/${locale}/knowledge`}>
                <ArrowRight className="h-4 w-4" />
                Ir para Base de Conhecimento
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Preview parcial: conteúdo visível mas scores ocultos via contexto (CL-009)
  if (!isActivated) {
    return (
      <PreviewActivationContext.Provider value={{ isActivated: false }}>
        <div className="relative" data-testid="preview-gate-partial">
          {children}
          <div className="mt-2 flex items-center justify-center gap-1.5 rounded-md border border-border/50 bg-muted/30 px-3 py-1.5">
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Preview — ative para ver scores
            </span>
          </div>
        </div>
      </PreviewActivationContext.Provider>
    )
  }

  // Estado ativo: acesso total
  return (
    <PreviewActivationContext.Provider value={{ isActivated: true }}>
      {children}
    </PreviewActivationContext.Provider>
  )
}
