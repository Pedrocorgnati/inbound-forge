'use client'

// module-9: TemplateSelector — Visual template selection
// Rastreabilidade: TASK-5, G-002, P6, FEAT-creative-generation-005

import { useState, useEffect, useCallback } from 'react'
import { LayoutGrid, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { IMAGE_DIMENSIONS } from '@/lib/constants/image-worker'
import type { ImageTemplate, TemplateType, TemplateChannel } from '@/types/image-template'

interface TemplateSelectorProps {
  selectedTemplateId?: string | null
  channel?: TemplateChannel
  onSelect: (template: ImageTemplate) => void
  disabled?: boolean
}

const TEMPLATE_LABELS: Record<TemplateType, string> = {
  CAROUSEL:          'Carrossel',
  STATIC_LANDSCAPE:  'Paisagem',
  STATIC_PORTRAIT:   'Retrato',
  VIDEO_COVER:       'Capa de Vídeo',
  BEFORE_AFTER:      'Antes/Depois',
  ERROR_CARD:        'Card de Erro',
  SOLUTION_CARD:     'Card de Solução',
  BACKSTAGE_CARD:    'Card Backstage',
}

const CHANNEL_LABELS: Record<TemplateChannel, string> = {
  instagram: 'Instagram',
  linkedin:  'LinkedIn',
  blog:      'Blog',
}

export function TemplateSelector({ selectedTemplateId, channel, onSelect, disabled }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<ImageTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/image-templates')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      const list: ImageTemplate[] = json.data ?? json
      setTemplates(list.filter((t) => t.isActive))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar templates')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  // Filter by channel if provided
  const filtered = channel
    ? templates.filter((t) => t.channel === channel)
    : templates

  return (
    <Card data-testid="template-selector">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <LayoutGrid className="h-4 w-4" />
          Template de Arte
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex h-20 items-center justify-center">
            <p className="text-xs text-muted-foreground">Carregando templates...</p>
          </div>
        )}

        {error && (
          <p className="text-xs text-danger" data-testid="template-error">{error}</p>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhum template disponível{channel ? ` para ${CHANNEL_LABELS[channel]}` : ''}.</p>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-2 gap-2" data-testid="template-grid">
            {filtered.map((template) => {
              const dims = IMAGE_DIMENSIONS[template.templateType]
              const isSelected = template.id === selectedTemplateId
              const aspectRatio = dims ? dims.widthPx / dims.heightPx : 1

              return (
                <button
                  key={template.id}
                  onClick={() => onSelect(template)}
                  disabled={disabled}
                  data-testid={`template-option-${template.templateType}`}
                  className={`
                    relative flex flex-col items-center gap-1 rounded-md border p-2 text-left transition-colors
                    ${isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'}
                    ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                  `}
                >
                  {/* Aspect ratio preview */}
                  <div
                    className="w-full rounded bg-muted/50"
                    style={{
                      aspectRatio: String(aspectRatio),
                      maxHeight: '60px',
                    }}
                  />

                  {/* Label */}
                  <span className="text-[10px] font-medium leading-tight">
                    {TEMPLATE_LABELS[template.templateType] ?? template.name}
                  </span>

                  {/* Dimensions */}
                  <span className="text-[9px] text-muted-foreground">
                    {dims ? `${dims.widthPx}×${dims.heightPx}` : ''}
                  </span>

                  {/* Provider badge (Flux economico vs Ideogram texto) */}
                  <span
                    className={`mt-0.5 rounded px-1 text-[8px] font-medium ${
                      template.backgroundNeedsText
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                    data-testid={`template-provider-${template.templateType}`}
                  >
                    {template.backgroundNeedsText ? 'Ideogram (texto)' : 'Flux (economico)'}
                  </span>

                  {/* Selected check */}
                  {isSelected && (
                    <div className="absolute right-1 top-1 rounded-full bg-primary p-0.5">
                      <Check className="h-2.5 w-2.5 text-primary-foreground" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
