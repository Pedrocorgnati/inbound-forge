'use client'

import { useState, useCallback } from 'react'
import { Pencil, Trash2, RotateCcw } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ObjectionResponse } from '@/lib/dtos/objection.dto'

interface ObjectionCardProps {
  objection: ObjectionResponse
  onEdit: (objection: ObjectionResponse) => void
  onDelete: (objection: ObjectionResponse) => void
  locale: string
}

const TYPE_MAP: Record<string, { label: string; variant: 'warning' | 'danger' | 'info' | 'primary' | 'default' }> = {
  PRICE: { label: 'Preço', variant: 'warning' },
  TRUST: { label: 'Confiança', variant: 'danger' },
  TIMING: { label: 'Timing', variant: 'info' },
  NEED: { label: 'Necessidade', variant: 'primary' },
  AUTHORITY: { label: 'Autoridade', variant: 'default' },
}

const STATUS_MAP: Record<string, { label: string; variant: 'warning' | 'success' }> = {
  DRAFT: { label: 'Rascunho', variant: 'warning' },
  VALIDATED: { label: 'Publicado', variant: 'success' },
}

function snippetContent(text: string, maxLen = 120): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen).trimEnd() + '...'
}

export function ObjectionCard({ objection, onEdit, onDelete, _locale }: ObjectionCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)

  const typeInfo = TYPE_MAP[objection.type] ?? { label: objection.type, variant: 'default' as const }
  const statusInfo = STATUS_MAP[objection.status] ?? { label: objection.status, variant: 'warning' as const }

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev)
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleFlip()
      }
    },
    [handleFlip]
  )

  return (
    <div
      className="group [perspective:1000px]"
      data-testid={`objection-card-${objection.id}`}
    >
      <div
        className={`relative h-[220px] transition-transform duration-500 [transform-style:preserve-3d] motion-reduce:transition-none motion-reduce:duration-0 ${
          isFlipped ? '[transform:rotateY(180deg)]' : ''
        }`}
      >
        {/* FRONT */}
        <div className="absolute inset-0 [backface-visibility:hidden]">
          <Card
            variant="elevated"
            className="flex h-full flex-col justify-between p-5"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>
                <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-foreground">
                {snippetContent(objection.content)}
              </p>
            </div>

            <div className="flex items-center justify-end pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFlip}
                onKeyDown={handleKeyDown}
                aria-expanded={isFlipped}
                aria-label="Ver detalhes e ações"
                data-testid={`objection-flip-${objection.id}`}
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                Detalhes
              </Button>
            </div>
          </Card>
        </div>

        {/* BACK */}
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <Card
            variant="elevated"
            className="flex h-full flex-col justify-between bg-surface p-5"
          >
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Objeção completa
              </p>
              <p className="mt-2 text-sm leading-relaxed text-foreground">
                {objection.content}
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFlip}
                onKeyDown={handleKeyDown}
                aria-expanded={isFlipped}
                aria-label="Voltar para frente do card"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                Voltar
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(objection)}
                  data-testid={`objection-edit-${objection.id}`}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(objection)}
                  className="text-danger hover:text-danger hover:bg-danger/10"
                  data-testid={`objection-delete-${objection.id}`}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  Deletar
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
