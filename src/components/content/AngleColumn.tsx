'use client'

import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { History, ExternalLink, MessageCircle, Globe, Linkedin, Instagram } from 'lucide-react'
import { CONTENT_ANGLE_LABELS } from '@/lib/constants/content.constants'
import { CHANNEL_CHAR_LIMITS } from '@/lib/constants/content.constants'
import type { Channel } from '@prisma/client'
import type { AngleVariant } from '@/hooks/useContentEditor'
import { AngleEditor } from './AngleEditor'
import { CharCounter } from './CharCounter'
import { CopyToClipboard } from './CopyToClipboard'

const CHANNEL_ICONS: Record<string, typeof Globe> = {
  LINKEDIN:  Linkedin,
  INSTAGRAM: Instagram,
  WHATSAPP:  MessageCircle,
  BLOG:      Globe,
}

const CHANNEL_COLORS: Record<string, string> = {
  LINKEDIN:  'bg-blue-500/10 text-blue-600 border-blue-500/20',
  INSTAGRAM: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
  WHATSAPP:  'bg-green-500/10 text-green-600 border-green-500/20',
  BLOG:      'bg-orange-500/10 text-orange-600 border-orange-500/20',
}

const CTA_LABELS: Record<string, string> = {
  WHATSAPP: 'WhatsApp',
  BLOG:     'Blog',
  CONTACT:  'Contato',
  LANDING:  'Landing Page',
  DIRECT:   'Mensagem Direta',
}

interface AngleColumnProps {
  angle: AngleVariant
  isSelected: boolean
  selectedChannel: Channel
  onSelect: (angleId: string) => void
  onSave: (angleId: string, editedBody: string) => Promise<void>
  onOpenHistory: (angleId: string) => void
  disabled?: boolean
}

export function AngleColumn({
  angle,
  isSelected,
  selectedChannel,
  onSelect,
  onSave,
  onOpenHistory,
  disabled,
}: AngleColumnProps) {
  const angleLabel = CONTENT_ANGLE_LABELS[angle.angle as keyof typeof CONTENT_ANGLE_LABELS] ?? angle.angle
  const charLimit = CHANNEL_CHAR_LIMITS[selectedChannel] ?? Infinity
  const displayText = angle.editedBody ?? angle.text
  const charCount = displayText.length
  const charCounterId = `char-counter-${angle.id}`

  return (
    <Card
      variant={isSelected ? 'elevated' : 'default'}
      className={cn(
        'flex flex-col p-4 transition-colors cursor-pointer',
        isSelected && 'ring-2 ring-primary ring-offset-2'
      )}
      onClick={() => onSelect(angle.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(angle.id)
        }
      }}
      aria-label={`Ângulo: ${angleLabel}`}
      aria-pressed={isSelected}
      data-testid={`angle-column-${angle.angle}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-semibold text-foreground truncate" title={angleLabel}>{angleLabel}</h3> {/* G08: RESOLVED */}
          {isSelected && (
            <Badge variant="primary" data-testid="angle-selected-badge">
              Selecionado
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onOpenHistory(angle.id)
          }}
          aria-label={`Histórico de versões do ângulo ${angleLabel}`}
          data-testid={`angle-history-btn-${angle.angle}`}
        >
          <History className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor / Body */}
      <div
        className="flex-1 mb-3"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <AngleEditor
          angleId={angle.id}
          angleName={angleLabel}
          body={angle.text}
          editedBody={angle.editedBody}
          onSave={onSave}
          charCounterId={charCounterId}
          disabled={disabled}
        />
      </div>

      {/* CTA Section (CL-080) */}
      {(angle.ctaText ?? angle.recommendedCTA) && (
        <div
          className="mb-3 rounded-md border border-border/60 bg-muted/30 px-3 py-2"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          data-testid={`angle-cta-${angle.angle}`}
        >
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
            CTA
          </p>
          <div className="flex items-center gap-1.5">
            <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-xs text-foreground">
              {angle.ctaText ?? angle.recommendedCTA}
            </span>
          </div>
        </div>
      )}

      {/* Canal sugerido (CL-080) */}
      {angle.suggestedChannel && (
        <div
          className="mb-3"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          data-testid={`angle-channel-${angle.angle}`}
        >
          {(() => {
            const channelKey = String(angle.suggestedChannel)
            const Icon = CHANNEL_ICONS[channelKey] ?? Globe
            const colorClass = CHANNEL_COLORS[channelKey] ?? 'bg-muted text-muted-foreground border-border'
            const label = CTA_LABELS[channelKey] ?? channelKey
            return (
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${colorClass}`}>
                <Icon className="h-3 w-3" />
                {label}
              </span>
            )
          })()}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border pt-3 mt-auto">
        <CharCounter current={charCount} limit={charLimit} id={charCounterId} />
        <CopyToClipboard text={displayText} />
      </div>
    </Card>
  )
}
