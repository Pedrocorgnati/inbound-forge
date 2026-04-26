'use client'

// ThemeRankingTable — tabela de ranking de temas por conversão
// INT-027, INT-041 | PERF-002: paginação obrigatória

import React, { memo, useState, useEffect, useCallback, useTransition } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { SparklineChart } from './SparklineChart'
import { ChannelBreakdown } from './ChannelBreakdown'
import { EmptyState } from '@/components/shared/empty-state'
import { useThemeRanking } from '@/hooks/useThemeRanking'
import { useFormatters } from '@/lib/i18n/formatters'
import type { AnalyticsPeriod } from '@/types/analytics'
import { BarChart3 } from 'lucide-react'

interface ThemeRankingTableProps {
  period: AnalyticsPeriod
}

type SortBy = 'conversionScore' | 'leadsCount'
type SortDir = 'asc' | 'desc'

function SortIcon({ field, current, dir }: { field: SortBy; current: SortBy; dir: SortDir }) {
  if (field !== current) return <ArrowUpDown className="h-3 w-3 opacity-40" />
  return dir === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
}

const LIMIT = 20

function ThemeRankingTableComponent({ period }: ThemeRankingTableProps) {
  const fmt = useFormatters()
  const [sortBy, setSortBy] = useState<SortBy>('conversionScore')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)

  const { items, total, totalPages, isLoading, error, refetch } = useThemeRanking(period, sortBy, page, LIMIT, sortDir)

  useEffect(() => {
    if (error) {
      toast.error('Erro ao carregar ranking de temas')
    }
  }, [error])

  const [isSortPending, startSortTransition] = useTransition()

  const handleSort = useCallback((field: SortBy) => {
    startSortTransition(() => {
      if (field === sortBy) {
        setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
      } else {
        setSortBy(field)
        setSortDir('desc')
      }
      setPage(1)
    })
  }, [sortBy])

  const handleRetry = useCallback(() => refetch(), [refetch])
  const handleSortConversion = useCallback(() => handleSort('conversionScore'), [handleSort])
  const handleSortLeads = useCallback(() => handleSort('leadsCount'), [handleSort])
  const handlePrevPage = useCallback(() => setPage((p) => p - 1), [])
  const handleNextPage = useCallback(() => setPage((p) => p + 1), [])

  // Skeleton
  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-surface overflow-hidden">
        <table className="w-full text-sm" aria-busy="true" aria-label="Carregando ranking...">
          <thead className="bg-muted/50">
            <tr>
              {['#', 'Tema', 'Score', 'Leads', 'Conversões', 'Tendência', 'Canais'].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-t border-border">
                {Array.from({ length: 7 }).map((_, j) => (
                  <td key={j} className="px-3 py-2">
                    <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="flex flex-col items-center gap-2 py-4">
          <p className="text-sm text-muted-foreground">Erro ao carregar ranking de temas</p>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6">
        <EmptyState
          icon={<BarChart3 className="h-8 w-8" />}
          title="Nenhum tema com dados de conversão"
          description="Registre leads associados a temas para ver o ranking"
        />
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-surface overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label="Ranking de temas por conversão">
          <caption className="sr-only">
            Ranking de temas ordenados por {sortBy === 'conversionScore' ? 'score de conversão' : 'número de leads'}
          </caption>
          <thead className="bg-muted/50">
            <tr>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-8">#</th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Tema</th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                <button
                  type="button"
                  onClick={handleSortConversion}
                  disabled={isSortPending}
                  className="flex items-center gap-1 hover:text-foreground transition-colors disabled:opacity-60"
                >
                  Score <SortIcon field="conversionScore" current={sortBy} dir={sortDir} />
                </button>
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                <button
                  type="button"
                  onClick={handleSortLeads}
                  disabled={isSortPending}
                  className="flex items-center gap-1 hover:text-foreground transition-colors disabled:opacity-60"
                >
                  Leads <SortIcon field="leadsCount" current={sortBy} dir={sortDir} />
                </button>
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Conversões</th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">Tendência</th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">Canais</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.themeId} className="border-t border-border hover:bg-muted/20 transition-colors">
                <td className="px-3 py-2 text-muted-foreground text-xs">
                  {(page - 1) * LIMIT + index + 1}
                </td>
                <td className="px-3 py-2 font-medium text-foreground max-w-[200px] truncate">
                  {item.themeName}
                </td>
                <td className="px-3 py-2">
                  <span className="tabular-nums">{item.conversionScore}%</span>
                </td>
                <td className="px-3 py-2 tabular-nums">{fmt.number(item.leadsCount)}</td>
                <td className="px-3 py-2 tabular-nums">{fmt.number(item.conversionsCount)}</td>
                <td className="px-3 py-2 hidden md:table-cell">
                  <SparklineChart trend={item.trend} />
                </td>
                <td className="px-3 py-2 hidden md:table-cell">
                  <ChannelBreakdown breakdown={item.channelBreakdown} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-border text-sm text-muted-foreground">
          <span>Mostrando {Math.min(items.length, LIMIT)} de {total} temas</span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={handlePrevPage}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={handleNextPage}
            >
              Próximo
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export const ThemeRankingTable = memo(ThemeRankingTableComponent)
