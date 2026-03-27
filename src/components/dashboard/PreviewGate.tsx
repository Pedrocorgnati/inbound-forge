'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Lock, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PreviewGateProps {
  children: React.ReactNode
  isLocked: boolean
}

export function PreviewGate({ children, isLocked }: PreviewGateProps) {
  const { locale } = useParams<{ locale: string }>()

  if (!isLocked) return <>{children}</>

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
