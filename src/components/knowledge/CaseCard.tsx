'use client'

import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Link2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { CaseResponse } from '@/lib/dtos/case-library.dto'

interface CaseCardProps {
  caseData: CaseResponse
  onEdit?: () => void
  onDelete?: () => void
  locale: string
}

const STATUS_MAP: Record<string, { label: string; variant: 'warning' | 'success' }> = {
  DRAFT: { label: 'Rascunho', variant: 'warning' },
  VALIDATED: { label: 'Publicado', variant: 'success' },
}

function snippetOutcome(text: string, maxLen = 80): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen).trimEnd() + '...'
}

export function CaseCard({ caseData, onDelete, locale }: CaseCardProps) {
  const router = useRouter()
  const statusInfo = STATUS_MAP[caseData.status] ?? { label: caseData.status, variant: 'warning' as const }
  const painCount = caseData._count?.casePains ?? 0

  return (
    <Card variant="elevated" data-testid={`case-card-${caseData.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">{caseData.name}</CardTitle>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {snippetOutcome(caseData.outcome)}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="default">{caseData.sector}</Badge>
          <Badge variant="info">{caseData.systemType}</Badge>
          {painCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <Link2 className="h-3 w-3" aria-hidden />
              {painCount} {painCount === 1 ? 'dor vinculada' : 'dores vinculadas'}
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className="gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/${locale}/knowledge/cases/${caseData.id}/edit`)}
          data-testid={`case-edit-${caseData.id}`}
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          Editar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-danger hover:text-danger hover:bg-danger/10"
          data-testid={`case-delete-${caseData.id}`}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          Deletar
        </Button>
      </CardFooter>
    </Card>
  )
}
