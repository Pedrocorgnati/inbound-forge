'use client'

import Link from 'next/link'
import { Pencil, Trash2, Link2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { PainResponse } from '@/lib/dtos/pain-library.dto'
import { KNOWLEDGE_STATUS, KNOWLEDGE_STATUS_LABELS } from '@/constants/status'

interface PainCardProps {
  pain: PainResponse
  onEdit: () => void
  onDelete: () => void
  onLinkCases: () => void
  locale: string
}

const SECTOR_VARIANT: Record<string, 'default' | 'primary' | 'info' | 'success' | 'warning'> = {
  Tecnologia: 'primary',
  Saúde: 'success',
  Educação: 'info',
  Varejo: 'warning',
}

function snippet(text: string, maxLen = 80): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen).trimEnd() + '...'
}

export function PainCard({ pain, onEdit, onDelete, onLinkCases, locale }: PainCardProps) {
  const casesCount = pain.casesCount ?? 0

  return (
    <Card variant="elevated" data-testid={`pain-card-${pain.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          {/* Intake Review TASK-8 ST006 (CL-220): titulo vira link para detalhe. */}
          <CardTitle className="text-base leading-snug">
            <Link
              href={`/${locale}/knowledge/pains/${pain.id}`}
              className="hover:underline"
            >
              {pain.title}
            </Link>
          </CardTitle>
          <Badge variant={pain.status === KNOWLEDGE_STATUS.VALIDATED ? 'success' : 'warning'}>
            {KNOWLEDGE_STATUS_LABELS[pain.status as keyof typeof KNOWLEDGE_STATUS_LABELS] ?? pain.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {snippet(pain.description)}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {pain.sectors.map((sector) => (
            <Badge key={sector} variant={SECTOR_VARIANT[sector] ?? 'default'}>
              {sector}
            </Badge>
          ))}
          {casesCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <Link2 className="h-3 w-3" aria-hidden />
              {casesCount} {casesCount === 1 ? 'case' : 'cases'}
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className="gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onLinkCases}
          data-testid={`pain-link-cases-${pain.id}`}
        >
          <Link2 className="h-3.5 w-3.5" aria-hidden />
          Vincular Cases
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          data-testid={`pain-edit-${pain.id}`}
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          Editar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-danger hover:text-danger hover:bg-danger/10"
          data-testid={`pain-delete-${pain.id}`}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          Deletar
        </Button>
      </CardFooter>
    </Card>
  )
}
