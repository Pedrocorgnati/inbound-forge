'use client'

import { List, KanbanSquare, RotateCcw } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { LeadsList } from '@/components/leads/LeadsList'
import { PipelineBoard } from '@/components/leads/PipelineBoard'
import type { LeadStatus } from '@/types/enums'

interface LeadCardData {
  id: string
  name: string
  company?: string | null
  status: LeadStatus
  score?: number
}

// Same key used by useLeadStatusMutation so optimistic updates propagate here
const LEADS_KEY = ['leads'] as const

async function fetchKanbanLeads(): Promise<LeadCardData[]> {
  const res = await fetch('/api/v1/leads?limit=100')
  if (!res.ok) throw new Error(`Erro ao carregar leads (${res.status})`)
  const json = await res.json()
  return (json.data ?? json.items ?? []).map(
    (l: { id: string; name?: string | null; company?: string | null; status: LeadStatus; score?: number }) => ({
      id: l.id,
      name: l.name ?? '(sem nome)',
      company: l.company,
      status: l.status,
      score: l.score,
    })
  )
}

function PipelineBoardContainer({ locale }: { locale: string }) {
  const { data = [], isLoading, error, refetch } = useQuery({
    queryKey: LEADS_KEY,
    queryFn: fetchKanbanLeads,
    staleTime: 30_000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        Carregando kanban...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-sm text-danger">
        <p>{error instanceof Error ? error.message : 'Erro ao carregar kanban'}</p>
        <button
          onClick={() => void refetch()}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
        >
          <RotateCcw className="h-3 w-3" aria-hidden />
          Tentar novamente
        </button>
      </div>
    )
  }

  return <PipelineBoard leads={data} locale={locale} />
}

interface LeadsLayoutClientProps {
  locale: string
}

export function LeadsLayoutClient({ locale }: LeadsLayoutClientProps) {
  return (
    <Tabs defaultValue="lista">
      <TabsList>
        <TabsTrigger value="lista" className="flex items-center gap-1.5">
          <List className="h-3.5 w-3.5" aria-hidden />
          Lista
        </TabsTrigger>
        <TabsTrigger value="kanban" className="flex items-center gap-1.5" data-testid="tab-kanban">
          <KanbanSquare className="h-3.5 w-3.5" aria-hidden />
          Kanban
        </TabsTrigger>
      </TabsList>

      <TabsContent value="lista">
        <LeadsList locale={locale} />
      </TabsContent>

      <TabsContent value="kanban">
        <PipelineBoardContainer locale={locale} />
      </TabsContent>
    </Tabs>
  )
}
