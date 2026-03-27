'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Ban, RotateCcw, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScoreGauge } from './ScoreGauge'
import { ThemeRejectModal } from './ThemeRejectModal'
import { ThemeRestoreModal } from './ThemeRestoreModal'
import type { ThemeDto } from '@/hooks/useThemes'

interface ThemeCardProps {
  theme: ThemeDto
  isWide?: boolean
  onReject: (themeId: string, reason: string) => Promise<boolean>
  onRestore: (themeId: string) => Promise<boolean>
  onMutate: () => void
}

export function ThemeCard({ theme, isWide, onReject, onRestore, onMutate }: ThemeCardProps) {
  const { locale } = useParams<{ locale: string }>()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [restoreOpen, setRestoreOpen] = useState(false)

  const isRejected = theme.status === 'REJECTED'
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
          'relative flex flex-col p-5 transition-all duration-200',
          isWide ? 'col-span-2' : 'col-span-1',
          isRejected && 'opacity-60 border-dashed',
          !isRejected && '@media (hover: hover) { hover:shadow-md hover:-translate-y-0.5 }'
        )}
        aria-label={isRejected ? `Tema rejeitado: ${theme.title}` : undefined}
      >
        <div className="flex items-start justify-between gap-3">
          <Badge variant={isRejected ? 'danger' : 'success'}>
            {isRejected ? 'Rejeitado' : 'Ativo'}
          </Badge>
          <ScoreGauge
            score={theme.conversionScore}
            size={isWide ? 'md' : 'sm'}
          />
        </div>

        <h3 className="mt-3 font-semibold text-foreground line-clamp-2">
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
