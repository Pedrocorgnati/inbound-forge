'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  Globe,
  PauseCircle,
  PlayCircle,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SkeletonCard } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { SourceCompliance } from './SourceCompliance'
import { SourceLogs } from './SourceLogs'

interface SourceDetailPayload {
  source: {
    id: string
    name: string
    url: string
    type: 'RSS' | 'SCRAPING' | 'MANUAL'
    isActive: boolean
    isProtected: boolean
    selector: string | null
    crawlFrequency: string
    rateLimitPerMinute: number
    lastCrawledAt: string | null
    antiBotBlocked: boolean
    antiBotReason: string | null
    antiBotBlockedAt: string | null
    consecutiveFailures: number
    createdAt: string
    updatedAt: string
  }
  metrics: {
    totalRuns: number
    successfulRuns: number
    failedRuns: number
    partialRuns: number
    successRate: number | null
    scrapedTextsCount: number
  }
  compliance: {
    robotsTxtRespected: boolean
    browserlessConfigured: boolean
    rateLimited: boolean
    lgpdAuditEnabled: boolean
    antiBotProtectionOk: boolean
  }
  logs: Array<{
    id: string
    sourceUrl: string
    textsCollected: number
    textsClassified: number
    errorsCount: number
    durationMs: number
    status: 'SUCCESS' | 'PARTIAL' | 'FAILED'
    errorMessage: string | null
    createdAt: string
  }>
}

interface ApiResponse {
  success: boolean
  data: SourceDetailPayload
  error?: string
}

interface SourceDetailProps {
  sourceId: string
  locale: string
}

function formatDate(value: string | null) {
  if (!value) return 'Nunca'
  return new Date(value).toLocaleString('pt-BR')
}

function typeLabel(type: SourceDetailPayload['source']['type']) {
  if (type === 'RSS') return 'RSS'
  if (type === 'SCRAPING') return 'Scraping'
  return 'Manual'
}

export function SourceDetail({ sourceId, locale }: SourceDetailProps) {
  const [data, setData] = useState<SourceDetailPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const auditHref = useMemo(
    () => `/${locale}/compliance/audit?sourceId=${encodeURIComponent(sourceId)}`,
    [locale, sourceId]
  )

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/v1/sources/${sourceId}`, { cache: 'no-store' })
      const json = (await response.json().catch(() => null)) as ApiResponse | null
      if (!response.ok || !json?.success) {
        throw new Error(json?.error ?? 'Erro ao carregar fonte')
      }
      setData(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setIsLoading(false)
    }
  }, [sourceId])

  useEffect(() => {
    load()
  }, [load])

  async function handleToggleActive() {
    if (!data) return
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/v1/sources/${sourceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !data.source.isActive }),
      })
      if (!response.ok) {
        const json = await response.json().catch(() => ({}))
        throw new Error(json.error ?? 'Falha ao atualizar fonte')
      }
      toast.success(data.source.isActive ? 'Fonte pausada' : 'Fonte ativada')
      setConfirmOpen(false)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao atualizar fonte')
    } finally {
      setIsUpdating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="source-detail-loading">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-4" data-testid="source-detail-error">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/${locale}/sources`}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Voltar
          </Link>
        </Button>
        <div className="flex items-center gap-2 rounded-md border border-danger/20 bg-danger/10 px-4 py-3" role="alert">
          <AlertTriangle className="h-4 w-4 text-danger" aria-hidden />
          <p className="text-sm text-danger">{error ?? 'Fonte nao encontrada'}</p>
          <Button variant="ghost" size="sm" onClick={load} className="ml-auto">
            <RefreshCw className="h-4 w-4" aria-hidden />
            Recarregar
          </Button>
        </div>
      </div>
    )
  }

  const { source, metrics } = data

  return (
    <div className="space-y-5" data-testid="source-detail-page">
      <Button asChild variant="ghost" size="sm">
        <Link href={`/${locale}/sources`}>
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Voltar
        </Link>
      </Button>

      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Globe className="h-5 w-5 text-muted-foreground" aria-hidden />
            <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">{source.name}</h1>
            <Badge variant={source.isActive ? 'success' : 'default'}>{source.isActive ? 'Ativa' : 'Pausada'}</Badge>
            <Badge variant="info">{typeLabel(source.type)}</Badge>
          </div>
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex max-w-full items-center gap-1 truncate text-sm text-primary hover:underline"
          >
            <span className="truncate">{source.url}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
          </a>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={auditHref}>
              <ExternalLink className="h-4 w-4" aria-hidden />
              Auditoria
            </Link>
          </Button>
          <Button
            variant={source.isActive ? 'destructive' : 'default'}
            onClick={() => setConfirmOpen(true)}
            isLoading={isUpdating}
            loadingText={source.isActive ? 'Pausando...' : 'Ativando...'}
          >
            {source.isActive ? (
              <PauseCircle className="h-4 w-4" aria-hidden />
            ) : (
              <PlayCircle className="h-4 w-4" aria-hidden />
            )}
            {source.isActive ? 'Pausar fonte' : 'Ativar fonte'}
          </Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Taxa de sucesso" value={metrics.successRate === null ? 'Sem dados' : `${metrics.successRate}%`} />
        <MetricCard label="Coletas" value={String(metrics.totalRuns)} />
        <MetricCard label="Textos coletados" value={String(metrics.scrapedTextsCount)} />
        <MetricCard label="Ultima coleta" value={formatDate(source.lastCrawledAt)} compact />
      </div>

      <Card variant="surface" data-testid="source-detail-summary">
        <CardHeader>
          <CardTitle>Detalhes da fonte</CardTitle>
          <CardDescription>Configuracao atual usada pelo worker de scraping.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem label="Frequencia" value={source.crawlFrequency} />
            <InfoItem label="Rate limit" value={`${source.rateLimitPerMinute}/min`} />
            <InfoItem label="Falhas consecutivas" value={String(source.consecutiveFailures)} />
            <InfoItem label="Seletor" value={source.selector ?? 'Nao configurado'} />
            <InfoItem label="Criada em" value={formatDate(source.createdAt)} />
            <InfoItem label="Atualizada em" value={formatDate(source.updatedAt)} />
          </dl>
          {source.antiBotBlocked && (
            <div className="mt-4 rounded-md border border-danger/20 bg-danger/10 p-3 text-sm text-danger" role="alert">
              Fonte pausada por anti-bot: {source.antiBotReason ?? 'motivo nao informado'}
            </div>
          )}
        </CardContent>
      </Card>

      <SourceCompliance compliance={data.compliance} />
      <SourceLogs logs={data.logs} auditHref={auditHref} />

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleToggleActive}
        title={source.isActive ? `Pausar "${source.name}"` : `Ativar "${source.name}"`}
        message={
          source.isActive
            ? 'A fonte deixara de entrar nas proximas execucoes do worker ate ser ativada novamente.'
            : 'A fonte voltara a entrar nas proximas execucoes do worker.'
        }
        confirmText={source.isActive ? 'Pausar fonte' : 'Ativar fonte'}
        cancelText="Cancelar"
        variant="warning"
      />
    </div>
  )
}

function MetricCard({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <Card variant="surface">
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
        <p className={compact ? 'mt-2 text-sm font-semibold text-foreground' : 'mt-2 text-2xl font-semibold text-foreground'}>
          {value}
        </p>
      </CardContent>
    </Card>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm text-foreground">{value}</dd>
    </div>
  )
}
