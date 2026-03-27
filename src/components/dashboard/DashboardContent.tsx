'use client'

import { LayoutDashboard } from 'lucide-react'
import { EmptyState } from '@/components/shared/empty-state'
import { DashboardHeader } from './DashboardHeader'
import { PreviewGate } from './PreviewGate'
import { BentoGrid as ThemeBentoGrid } from './BentoGrid'
import { BentoGrid, BentoCell } from '@/components/ux/BentoGrid'
import { useThemes } from '@/hooks/useThemes'
import { useThemeActions } from '@/hooks/useThemeActions'

export function DashboardContent() {
  const {
    themes,
    total,
    isLoading,
    error,
    isLocked,
    statusFilter,
    setStatusFilter,
    refetch,
  } = useThemes()

  const { reject, restore, generate, scoreAll, isGenerating, isScoringAll } =
    useThemeActions()

  async function handleGenerate() {
    const result = await generate()
    if (result && result.created > 0) refetch()
  }

  async function handleScoreAll() {
    const result = await scoreAll()
    if (result) refetch()
  }

  const showEmpty = !isLoading && !error && themes.length === 0

  return (
    <div data-testid="dashboard-page" className="space-y-6">
      <BentoGrid layout="default">
        {/* Header: full width */}
        <BentoCell colSpan={12} className="border-0 bg-transparent p-0">
          <DashboardHeader
            total={total}
            statusFilter={statusFilter}
            onStatusFilter={setStatusFilter}
            onGenerate={handleGenerate}
            onScoreAll={handleScoreAll}
            isGenerating={isGenerating}
            isScoringAll={isScoringAll}
          />
        </BentoCell>

        {/* Error banner */}
        {error && (
          <BentoCell colSpan={12} className="border-destructive/50 bg-destructive/10 text-sm text-destructive">
            {error}
          </BentoCell>
        )}

        {/* Main content area: full width */}
        <BentoCell colSpan={12} className="border-0 bg-transparent p-0">
          {showEmpty ? (
            <EmptyState
              icon={<LayoutDashboard className="h-12 w-12" />}
              title="Nenhum tema ainda"
              description="Gere seus primeiros temas a partir da base de conhecimento."
              ctaLabel="Gerar Temas"
              onCtaClick={handleGenerate}
            />
          ) : (
            <PreviewGate isLocked={isLocked}>
              <ThemeBentoGrid
                themes={themes}
                isLoading={isLoading}
                onReject={reject}
                onRestore={restore}
                onMutate={refetch}
              />
            </PreviewGate>
          )}
        </BentoCell>
      </BentoGrid>
    </div>
  )
}
