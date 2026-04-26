'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type PipelinePhase = 'SCRAPING' | 'CLASSIFYING' | 'SCORING' | 'QUEUING' | 'IDLE'

interface PipelineStatusCardProps {
  phase: PipelinePhase
  itemsInFlight: number
}

const LABEL: Record<PipelinePhase, string> = {
  SCRAPING: 'Coletando fontes',
  CLASSIFYING: 'Classificando conteúdo',
  SCORING: 'Rankeando temas',
  QUEUING: 'Enfileirando posts',
  IDLE: 'Inativo',
}

export function PipelineStatusCard({ phase, itemsInFlight }: PipelineStatusCardProps) {
  return (
    <Card data-testid="pipeline-status-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold">Pipeline</CardTitle>
        <Badge variant={phase === 'IDLE' ? 'default' : 'success'}>{LABEL[phase]}</Badge>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{itemsInFlight}</p>
        <p className="text-xs text-muted-foreground">itens em processamento</p>
      </CardContent>
    </Card>
  )
}
