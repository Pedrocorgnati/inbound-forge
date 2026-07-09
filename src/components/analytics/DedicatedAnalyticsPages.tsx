'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Activity, BarChart3, Brain, MousePointerClick, RotateCcw, TrendingUp, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { PeriodSelector } from '@/components/analytics/PeriodSelector'
import { ThemeRankingTable } from '@/components/analytics/ThemeRankingTable'
import { ChannelPerformanceCard } from '@/components/analytics/ChannelPerformanceCard'
import { CHANNEL_COLORS } from '@/constants/analytics-constants'
import type { AnalyticsPeriod, ChannelPerformance } from '@/types/analytics'
import type { Channel } from '@/types/enums'

const CORE_CHANNEL_LABELS: Record<string, string> = {
  BLOG: 'Blog',
  LINKEDIN: 'LinkedIn',
  INSTAGRAM: 'Instagram',
}

interface LtrStatus {
  active: boolean
  postsCount: number
  conversionsCount: number
  thresholds: { postsRequired: number; conversionsRequired: number }
  progress: { posts: number; conversions: number }
  lastRecalculation: string | null
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR').format(value)
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`
}

function ChannelComparisonSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-3" aria-busy="true">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} variant="surface">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-28" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function AnalyticsThemesPageContent() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d')

  return (
    <div className="space-y-6" data-testid="analytics-themes-content">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodSelector value={period} onChange={setPeriod} />
        <Badge variant="info">Ordenado por taxa real de conversão</Badge>
      </div>

      <ThemeRankingTable period={period} />
    </div>
  )
}

export function AnalyticsChannelsPageContent() {
  const tToast = useTranslations('toasts')
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d')
  const [channels, setChannels] = useState<ChannelPerformance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    fetch(`/api/v1/analytics/channels?period=${period}&includeEmpty=core`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return
        if (json.success) {
          const data = (json.data ?? json) as { channels?: ChannelPerformance[] }
          setChannels(data.channels ?? [])
        } else {
          setError(new Error(json.error ?? 'Erro ao buscar canais'))
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err : new Error('Erro de rede'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [period, reloadKey])

  useEffect(() => {
    if (error) {
      toast.error(tToast('analytics.channels_load_failed'))
    }
  }, [error, tToast])

  const maxEngagement = useMemo(
    () => channels.reduce((acc, channel) => Math.max(acc, channel.engagementCount ?? 0), 0) || 1,
    [channels]
  )
  const hasAnyData = channels.some((channel) =>
    channel.leadsCount > 0 ||
    channel.conversionsCount > 0 ||
    (channel.engagementCount ?? 0) > 0 ||
    (channel.postsCount ?? 0) > 0
  )

  return (
    <div className="space-y-6" data-testid="analytics-channels-content">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodSelector value={period} onChange={setPeriod} disabled={isLoading} />
        <Button variant="outline" size="sm" onClick={() => setReloadKey((key) => key + 1)} disabled={isLoading}>
          <RotateCcw className="mr-2 h-4 w-4" aria-hidden />
          Atualizar
        </Button>
      </div>

      {isLoading ? (
        <ChannelComparisonSkeleton />
      ) : error ? (
        <Card variant="surface">
          <CardContent className="p-6">
            <EmptyState
              variant="error"
              title="Comparativo indisponível"
              description="Não foi possível carregar engajamento e conversão por canal."
              actionLabel="Tentar novamente"
              onAction={() => setReloadKey((key) => key + 1)}
            />
          </CardContent>
        </Card>
      ) : !hasAnyData ? (
        <Card variant="surface">
          <CardContent className="p-6">
            <EmptyState
              icon={<BarChart3 className="h-12 w-12" aria-hidden />}
              title="Sem dados para comparar"
              description="Publique posts com UTM e registre leads para comparar Instagram, LinkedIn e Blog."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {channels.map((channel) => {
            const engagement = channel.engagementCount ?? 0
            const posts = channel.postsCount ?? 0
            const engagementWidth = Math.max(4, Math.round((engagement / maxEngagement) * 100))
            const color = CHANNEL_COLORS[channel.channel as Channel] ?? '#6B7280'

            return (
              <Card key={channel.channel} variant="surface">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between gap-2 text-base">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
                      {CORE_CHANNEL_LABELS[channel.channel] ?? channel.channel}
                    </span>
                    <Badge variant={channel.conversionRate > 0 ? 'success' : 'default'}>
                      {formatPercent(channel.conversionRate)}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Engajamento</p>
                      <p className="mt-1 font-semibold tabular-nums">{formatNumber(engagement)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Leads</p>
                      <p className="mt-1 font-semibold tabular-nums">{formatNumber(channel.leadsCount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Conversões</p>
                      <p className="mt-1 font-semibold tabular-nums">{formatNumber(channel.conversionsCount)}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MousePointerClick className="h-3.5 w-3.5" aria-hidden />
                        Cliques UTM
                      </span>
                      <span>{formatNumber(posts)} posts</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${engagementWidth}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <section aria-labelledby="channels-table-heading" className="space-y-3">
        <h2 id="channels-table-heading" className="text-base font-medium text-foreground">
          Desempenho por canal
        </h2>
        <ChannelPerformanceCard period={period} />
      </section>
    </div>
  )
}

export function AnalyticsLearningPageContent() {
  const tToast = useTranslations('toasts')
  const [status, setStatus] = useState<LtrStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    fetch('/api/v1/analytics/ltr-status')
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return
        if (json.success) {
          setStatus(json.data as LtrStatus)
        } else {
          setError(new Error(json.error ?? 'Erro ao buscar status do LTR'))
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err : new Error('Erro de rede'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  useEffect(() => {
    if (error) {
      toast.error(tToast('analytics.ltr_load_failed'))
    }
  }, [error, tToast])

  if (isLoading) {
    return (
      <div className="grid gap-3 md:grid-cols-4" aria-busy="true" data-testid="analytics-learning-loading">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} variant="surface">
            <CardContent className="space-y-3 p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card variant="surface" data-testid="analytics-learning-error">
        <CardContent className="p-6">
          <EmptyState
            variant="error"
            title="Status indisponível"
            description="Não foi possível carregar o estado do Learn-to-Rank."
            actionLabel="Tentar novamente"
            onAction={() => setReloadKey((key) => key + 1)}
          />
        </CardContent>
      </Card>
    )
  }

  if (!status) {
    return (
      <Card variant="surface" data-testid="analytics-learning-empty">
        <CardContent className="p-6">
          <EmptyState
            icon={<Brain className="h-12 w-12" aria-hidden />}
            title="Sem snapshot de aprendizado"
            description="O status do Learn-to-Rank ainda não foi registrado."
          />
        </CardContent>
      </Card>
    )
  }

  const currentModel = status.active ? 'POST-LTR conversion-rate boost' : 'PRE-LTR score estático'
  const postsProgress = Math.round(status.progress.posts * 100)
  const conversionsProgress = Math.round(status.progress.conversions * 100)

  return (
    <div className="space-y-6" data-testid="analytics-learning-content">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge variant={status.active ? 'success' : 'warning'}>
          {status.active ? 'LTR ativo' : 'LTR aguardando threshold'}
        </Badge>
        <Button variant="outline" size="sm" onClick={() => setReloadKey((key) => key + 1)}>
          <RotateCcw className="mr-2 h-4 w-4" aria-hidden />
          Atualizar
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card variant="surface">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Activity className="h-4 w-4" aria-hidden />
              Posts publicados
            </div>
            <p className="mt-3 text-2xl font-semibold tabular-nums">{formatNumber(status.postsCount)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatNumber(status.thresholds.postsRequired)} necessários
            </p>
          </CardContent>
        </Card>

        <Card variant="surface">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" aria-hidden />
              Conversões
            </div>
            <p className="mt-3 text-2xl font-semibold tabular-nums">{formatNumber(status.conversionsCount)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatNumber(status.thresholds.conversionsRequired)} necessárias
            </p>
          </CardContent>
        </Card>

        <Card variant="surface">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Brain className="h-4 w-4" aria-hidden />
              Modelo atual
            </div>
            <p className="mt-3 text-sm font-semibold">{currentModel}</p>
          </CardContent>
        </Card>

        <Card variant="surface">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="h-4 w-4" aria-hidden />
              Último retreino
            </div>
            <p className="mt-3 text-sm font-semibold">
              {status.lastRecalculation
                ? new Date(status.lastRecalculation).toLocaleString('pt-BR')
                : 'Ainda não registrado'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card variant="surface">
        <CardHeader>
          <CardTitle className="text-base">Progresso do threshold</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Posts</span>
              <span className="tabular-nums">{postsProgress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${postsProgress}%` }} />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Conversões</span>
              <span className="tabular-nums">{conversionsProgress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-success" style={{ width: `${conversionsProgress}%` }} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
