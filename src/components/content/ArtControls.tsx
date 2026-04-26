'use client'

// ArtControls — Controles para trocar template, editar headline e gerar novo background
// Rastreabilidade: CL-083, TASK-4 ST003

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TemplateSelector } from './TemplateSelector'
import type { ImageTemplate, TemplateChannel } from '@/types/image-template'

type DimensionPreset = 'og' | 'instagram'

const DIMENSION_PRESETS: Record<DimensionPreset, { label: string; width: number; height: number }> = {
  og:        { label: 'OG (1200×630)',      width: 1200, height: 630  },
  instagram: { label: 'Instagram (1080×1350)', width: 1080, height: 1350 },
}

interface ArtControlsProps {
  headline?: string
  selectedTemplateId?: string | null
  channel?: TemplateChannel
  dimensions?: DimensionPreset
  isRegenerating?: boolean
  onTemplateChange: (template: ImageTemplate) => void
  onHeadlineChange: (headline: string) => void
  onRegenerateBackground: (dimensions: { width: number; height: number }) => void
  onDimensionChange?: (preset: DimensionPreset) => void
  disabled?: boolean
}

export function ArtControls({
  headline = '',
  selectedTemplateId,
  channel,
  dimensions = 'og',
  isRegenerating = false,
  onTemplateChange,
  onHeadlineChange,
  onRegenerateBackground,
  onDimensionChange,
  disabled,
}: ArtControlsProps) {
  const [localHeadline, setLocalHeadline] = useState(headline)

  function handleHeadlineBlur() {
    if (localHeadline !== headline) {
      onHeadlineChange(localHeadline)
    }
  }

  function handleHeadlineKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      onHeadlineChange(localHeadline)
    }
  }

  const currentDimensions = DIMENSION_PRESETS[dimensions]

  return (
    <div className="space-y-4" data-testid="art-controls">
      {/* Template selector */}
      <TemplateSelector
        selectedTemplateId={selectedTemplateId}
        channel={channel}
        onSelect={onTemplateChange}
        disabled={disabled}
      />

      {/* Headline editor */}
      <div className="space-y-1.5">
        <Label htmlFor="art-headline" className="text-xs font-medium">
          Headline
        </Label>
        <Input
          id="art-headline"
          data-testid="art-headline-input"
          value={localHeadline}
          onChange={(e) => setLocalHeadline(e.target.value)}
          onBlur={handleHeadlineBlur}
          onKeyDown={handleHeadlineKeyDown}
          placeholder="Título principal da arte..."
          disabled={disabled}
          className="text-sm"
        />
      </div>

      {/* Dimension toggle */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Formato</Label>
        <div className="flex gap-2" role="group" aria-label="Formato da arte">
          {(Object.keys(DIMENSION_PRESETS) as DimensionPreset[]).map((preset) => (
            <button
              key={preset}
              type="button"
              data-testid={`dimension-${preset}`}
              onClick={() => onDimensionChange?.(preset)}
              disabled={disabled}
              className={`flex-1 rounded-md border px-2 py-1.5 text-xs transition-colors ${
                dimensions === preset
                  ? 'border-primary bg-primary/5 text-primary font-medium'
                  : 'border-border text-muted-foreground hover:border-primary/50'
              } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
              {DIMENSION_PRESETS[preset].label}
            </button>
          ))}
        </div>
      </div>

      {/* Regenerate background button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        data-testid="regenerate-background-btn"
        onClick={() => onRegenerateBackground(currentDimensions)}
        disabled={disabled || isRegenerating}
      >
        <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
        {isRegenerating ? 'Gerando...' : 'Novo Background'}
      </Button>
    </div>
  )
}
