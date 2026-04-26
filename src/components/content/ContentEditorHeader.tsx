'use client'

import { Sparkles, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ContentStatusBadge } from './ContentStatusBadge'
import { ChannelSelector } from './ChannelSelector'
import { CopyContextButton } from './CopyContextButton'
import type { Channel } from '@prisma/client'

interface ContentEditorHeaderProps {
  themeId: string
  themeTitle: string
  status: string | null
  selectedChannel: Channel
  isGenerating: boolean
  hasAngles: boolean
  onChangeChannel: (channel: Channel) => void
  onGenerate: (force?: boolean) => void
}

export function ContentEditorHeader({
  themeId,
  themeTitle,
  status,
  selectedChannel,
  isGenerating,
  hasAngles,
  onChangeChannel,
  onGenerate,
}: ContentEditorHeaderProps) {
  return (
    <div
      className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      data-testid="content-editor-header"
    >
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-2xl font-bold text-foreground truncate">{themeTitle}</h1>
        {status && <ContentStatusBadge status={status} />}
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <CopyContextButton themeId={themeId} disabled={isGenerating} />

        <ChannelSelector
          value={selectedChannel}
          onChange={onChangeChannel}
          disabled={isGenerating}
        />

        {hasAngles ? (
          <Button
            variant="outline"
            onClick={() => onGenerate(true)}
            isLoading={isGenerating}
            loadingText="Regenerando..."
            data-testid="regenerate-btn"
          >
            <RefreshCw className="h-4 w-4" />
            Regenerar
          </Button>
        ) : (
          <Button
            onClick={() => onGenerate(false)}
            isLoading={isGenerating}
            loadingText="Gerando..."
            data-testid="generate-btn"
          >
            <Sparkles className="h-4 w-4" />
            Gerar Conteúdo
          </Button>
        )}
      </div>
    </div>
  )
}
