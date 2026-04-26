'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Ban, Eye, Globe, Lock, RotateCcw, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScoreGauge } from './ScoreGauge'
import { ThemeRejectModal } from './ThemeRejectModal'
import { ThemeRestoreModal } from './ThemeRestoreModal'
import { ScoreBreakdown } from '@/components/niches/ScoreBreakdown'
import { GeoBonusBadge } from '@/components/themes/GeoBonusBadge'
import type { ThemeDto } from '@/hooks/useThemes'
import { THEME_STATUS } from '@/constants/status'

interface ThemeCardProps {
  theme: ThemeDto
  isWide?: boolean
  /**
   * Intake Review TASK-12 ST002 (CL-027): se false, o score e renderizado com blur
   * e o card exibe badge "Desbloqueie" ate o operador ativar o motor.
   */
  engineActivated?: boolean
  onReject: (themeId: string, reason: string) => Promise<boolean>
  onRestore: (themeId: string) => Promise<boolean>
  onMutate: () => void
}

export function ThemeCard({ theme, isWide, engineActivated = true, onReject, onRestore, onMutate }: ThemeCardProps) {
  const { locale } = useParams<{ locale: string }>()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [restoreOpen, setRestoreOpen] = useState(false)

  const isRejected = theme.status === THEME_STATUS.REJECTED
  const isGeoReady = theme.nicheOpportunity?.isGeoReady ?? false
  const snippetLen = isWide ? 200 : 120
  const painTitle = theme.pain?.title ?? ''
  const snippet = painTitle.length > snippetLen
    ? painTitle.slice(0, snippetLen) + '...'
    : painTitle

  return (
    <>
      <Card
        variant="elevated"
        className={cn(
          'relative flex flex-col p-5 transition-[border-color,box-shadow] duration-200',
          isWide ? 'col-span-2' : 'col-span-1',
          isRejected && 'opacity-60 border-dashed',
          !isRejected && '@media (hover: hover) { hover:shadow-md hover:-translate-y-0.5 }'
        )}
        aria-label={isRejected ? `Tema rejeitado: ${theme.title}` : undefined}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <Badge variant={isRejected ? 'danger' : 'success'}>
              {isRejected ? 'Rejeitado' : 'Ativo'}
            </Badge>
            {isGeoReady && (
              <Badge variant="info" className="gap-1">
                <Globe className="h-3 w-3" />
                GEO
              </Badge>
            )}
            {/* Intake Review TASK-5 ST003 (CL-170) — bonus GEO visivel no card */}
            {theme.geoBonus && theme.geoBonus.totalBonus > 0 && (
              <GeoBonusBadge
                bonus={theme.geoBonus.totalBonus}
                isQuestion={theme.geoBonus.isQuestion}
                hasData={theme.geoBonus.hasData}
                isComparison={theme.geoBonus.isComparison}
              />
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <div
              className={cn('relative', !engineActivated && 'group')}
              title={!engineActivated ? 'Valide 5 cases e 5 dores para desbloquear o score' : undefined}
            >
              <div className={cn(!engineActivated && 'blur-sm select-none pointer-events-none')}>
                <ScoreGauge
                  score={theme.conversionScore}
                  size={isWide ? 'md' : 'sm'}
                />
              </div>
              {!engineActivated && (
                <span
                  className="absolute inset-0 flex items-center justify-center"
                  aria-label="Score bloqueado — valide 5 cases e 5 dores"
                  data-testid="theme-card-locked-score"
                >
                  <Lock className="h-4 w-4 text-muted-foreground" aria-hidden />
                </span>
              )}
            </div>
            {engineActivated ? (
              <ScoreBreakdown
                breakdown={theme.scoreBreakdown}
                finalScore={theme.conversionScore}
              />
            ) : (
              <Badge variant="warning" className="gap-1 text-[10px]">
                <Lock className="h-3 w-3" aria-hidden />
                Desbloqueie
              </Badge>
            )}
          </div>
        </div>

        <h3 className="mt-3 font-semibold text-foreground line-clamp-2" title={theme.title}> {/* G08: RESOLVED */}
          {theme.title}
        </h3>

        {snippet && (
          <p className="mt-1.5 text-sm text-muted-foreground line-clamp-3">
            {snippet}
          </p>
        )}

        {isRejected && theme.rejectionReason && (
          <p className="mt-2 text-xs text-muted-foreground italic">
            Motivo: {theme.rejectionReason}
          </p>
        )}

        {!isRejected && theme.conversionScore < 33 && (
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-warning-bg px-2 py-0.5 text-xs font-medium text-[#92400E]">
            <Sparkles className="h-3 w-3" />
            Fortaleça a prova social
          </span>
        )}

        <div className="mt-auto flex items-center gap-2 border-t border-border pt-3 mt-4">
          {isRejected ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRestoreOpen(true)}
              className="min-h-[44px]"
            >
              <RotateCcw className="h-4 w-4" />
              Restaurar
            </Button>
          ) : (
            <>
              <Button asChild size="sm" className="min-h-[44px]">
                <Link href={`/${locale}/content/${theme.id}`}>
                  Criar Conteúdo
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectOpen(true)}
                className="min-h-[44px]"
              >
                <Ban className="h-4 w-4" />
                Rejeitar
              </Button>
              <Button asChild variant="ghost" size="sm" className="min-h-[44px]">
                <Link href={`/${locale}/themes/${theme.id}`} aria-label="Ver detalhes do tema">
                  <Eye className="h-4 w-4" />
                  Ver detalhes
                </Link>
              </Button>
            </>
          )}
        </div>
      </Card>

      <ThemeRejectModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        themeTitle={theme.title}
        onConfirm={async (reason) => {
          const ok = await onReject(theme.id, reason)
          if (ok) onMutate()
          return ok
        }}
      />

      <ThemeRestoreModal
        open={restoreOpen}
        onClose={() => setRestoreOpen(false)}
        themeTitle={theme.title}
        score={theme.conversionScore}
        onConfirm={async () => {
          const ok = await onRestore(theme.id)
          if (ok) onMutate()
          return ok
        }}
      />
    </>
  )
}
