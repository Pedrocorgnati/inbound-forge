'use client'

import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { History } from 'lucide-react'
import { CONTENT_ANGLE_LABELS } from '@/lib/constants/content.constants'
import { CHANNEL_CHAR_LIMITS } from '@/lib/constants/content.constants'
import type { Channel } from '@prisma/client'
import type { AngleVariant } from '@/hooks/useContentEditor'
import { AngleEditor } from './AngleEditor'
import { CharCounter } from './CharCounter'
import { CopyToClipboard } from './CopyToClipboard'

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
        'flex flex-col p-4 transition-all cursor-pointer',
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
          <h3 className="text-sm font-semibold text-foreground truncate">{angleLabel}</h3>
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

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border pt-3 mt-auto">
        <CharCounter current={charCount} limit={charLimit} id={charCounterId} />
        <CopyToClipboard text={displayText} />
      </div>
    </Card>
  )
}
