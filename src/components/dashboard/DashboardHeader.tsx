'use client'

import { RefreshCw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DashboardHeaderProps {
  total: number
  statusFilter: string | undefined
  onStatusFilter: (status: string | undefined) => void
  onGenerate: () => void
  onScoreAll: () => void
  isGenerating: boolean
  isScoringAll: boolean
}

const STATUS_TABS = [
  { label: 'Todos', value: undefined },
  { label: 'Ativos', value: 'ACTIVE' },
  { label: 'Rejeitados', value: 'REJECTED' },
] as const

export function DashboardHeader({
  total,
  statusFilter,
  onStatusFilter,
  onGenerate,
  onScoreAll,
  isGenerating,
  isScoringAll,
}: DashboardHeaderProps) {
  return (
    <div data-testid="dashboard-header" className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Temas de Conteúdo</h1>
          {total > 0 && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              Exibindo {total} temas
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onScoreAll}
            isLoading={isScoringAll}
            loadingText="Calculando..."
            disabled={isScoringAll || isGenerating}
            className="min-h-[44px]"
          >
            <RefreshCw className="h-4 w-4" />
            Recalcular Scores
          </Button>
          <Button
            size="sm"
            onClick={onGenerate}
            isLoading={isGenerating}
            loadingText="Gerando..."
            disabled={isGenerating || isScoringAll}
            className="min-h-[44px]"
          >
            <Sparkles className="h-4 w-4" />
            Gerar Temas
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => onStatusFilter(tab.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === tab.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
