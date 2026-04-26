'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AlertTriangle, ChevronRight, Eye, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import { ConversionHistory } from '@/components/conversions/ConversionHistory'
import { ConversionForm } from '@/components/conversions/ConversionForm'
import { AttributionCard } from '@/components/attribution/AttributionCard'
import type { Channel, FunnelStage } from '@/types/enums'
import Link from 'next/link'
import { useFormatters } from '@/lib/i18n/formatters'

// --- Types for the API response ---

interface LeadDetail {
  id: string
  name: string | null
  company: string | null
  contactInfo: string | null
  firstTouchPostId: string
  firstTouchThemeId: string
  channel: Channel | null
  funnelStage: FunnelStage | null
  lgpdConsent: boolean
  firstTouchAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  conversionEvents: Array<{
    id: string
    type: string
    occurredAt: string
    notes: string | null
  }>
  firstTouchTheme: {
    id: string
    title: string
    conversionScore: number | null
  } | null
  firstTouchPost: {
    id: string
    channel: string
  } | null
}

// --- Channel / Funnel Stage label maps ---

const CHANNEL_MAP: Record<string, { label: string; variant: 'instagram' | 'linkedin' | 'blog' }> = {
  INSTAGRAM: { label: 'Instagram', variant: 'instagram' },
  LINKEDIN: { label: 'LinkedIn', variant: 'linkedin' },
  BLOG: { label: 'Blog', variant: 'blog' },
}

const FUNNEL_MAP: Record<string, { label: string; variant: 'info' | 'warning' | 'success' }> = {
  AWARENESS: { label: 'Descoberta', variant: 'info' },
  CONSIDERATION: { label: 'Consideração', variant: 'warning' },
  DECISION: { label: 'Decisão', variant: 'success' },
}

// RESOLVED: G002 — dateFormatter substituído por useFormatters com locale dinâmico

// --- Component ---

export function LeadDetailClient() {
  const params = useParams<{ locale: string; id: string }>()
  const router = useRouter()
  const locale = params.locale
  const fmt = useFormatters()
  const id = params.id

  const [lead, setLead] = useState<LeadDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isRevealing, setIsRevealing] = useState(false)
  const [revealedContact, setRevealedContact] = useState<string | null>(null)

  const fetchLead = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/v1/leads/${id}`)
      if (!res.ok) {
        if (res.status === 404) {
          toast.error('Lead não encontrado')
          router.push(`/${locale}/leads`)
          return
        }
        throw new Error('Falha ao carregar lead')
      }

      const json = await res.json()
      setLead(json.data)
    } catch {
      setError('Não foi possível carregar o lead.')
    } finally {
      setIsLoading(false)
    }
  }, [id, locale, router])

  useEffect(() => {
    fetchLead()
  }, [fetchLead])

  async function handleRevealContact() {
    setIsRevealing(true)
    try {
      const res = await fetch(`/api/v1/leads/${id}?includeContact=true`)
      if (!res.ok) throw new Error('Falha ao revelar contato')
      const json = await res.json()
      setRevealedContact(json.data.contactInfo)
    } catch {
      toast.error('Erro ao revelar contato')
    } finally {
      setIsRevealing(false)
    }
  }

  function handleFormSuccess() {
    setShowForm(false)
    setRefreshKey((prev) => prev + 1)
    fetchLead()
  }

  // --- Loading State ---

  if (isLoading) {
    return (
      <div data-testid="lead-detail-loading" className="mx-auto max-w-3xl space-y-6">
        <Skeleton variant="text" className="h-4 w-64" />
        <Skeleton variant="text" className="h-8 w-48" />
        <Skeleton variant="rectangle" className="h-48 w-full" />
        <Skeleton variant="rectangle" className="h-32 w-full" />
      </div>
    )
  }

  // --- Error State ---

  if (error || !lead) {
    return (
      <div
        data-testid="lead-detail-error"
        className="mx-auto max-w-3xl flex flex-col items-center gap-4 py-12"
      >
        <AlertTriangle className="h-10 w-10 text-danger" />
        <p className="text-sm text-muted-foreground">{error ?? 'Lead não encontrado'}</p>
        <Button variant="outline" onClick={() => router.push(`/${locale}/leads`)}>
          Voltar para leads
        </Button>
      </div>
    )
  }

  // --- Data ---

  const companyName = lead.company ?? 'Lead sem empresa'
  const channelInfo = lead.channel ? CHANNEL_MAP[lead.channel] : null
  const funnelInfo = lead.funnelStage ? FUNNEL_MAP[lead.funnelStage] : null
  const themeScore = lead.firstTouchTheme?.conversionScore
  const contactDisplay = revealedContact ?? lead.contactInfo

  return (
    <div data-testid="lead-detail-page" className="mx-auto max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1 text-sm text-muted-foreground"
        data-testid="lead-breadcrumb"
      >
        <Link
          href={`/${locale}/dashboard`}
          className="hover:text-foreground transition-colors"
        >
          Dashboard
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <Link
          href={`/${locale}/leads`}
          className="hover:text-foreground transition-colors"
        >
          Leads
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <span className="text-foreground font-medium truncate max-w-[200px]">
          {companyName}
        </span>
      </nav>

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {companyName}
        </h1>
        {lead.firstTouchTheme && (
          <p className="mt-1 text-sm text-muted-foreground">
            Tema: {lead.firstTouchTheme.title}
          </p>
        )}
      </div>

      {/* Lead Info Card */}
      <Card variant="elevated" data-testid="lead-info-card">
        <CardHeader>
          <CardTitle className="text-base">Informações do Lead</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Empresa */}
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Empresa
              </dt>
              <dd className="mt-1 text-sm text-foreground">
                {lead.company ?? '—'}
              </dd>
            </div>

            {/* Canal */}
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Canal
              </dt>
              <dd className="mt-1">
                {channelInfo ? (
                  <Badge variant={channelInfo.variant}>{channelInfo.label}</Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </dd>
            </div>

            {/* Etapa do funil */}
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Etapa do Funil
              </dt>
              <dd className="mt-1">
                {funnelInfo ? (
                  <Badge variant={funnelInfo.variant}>{funnelInfo.label}</Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </dd>
            </div>

            {/* Primeiro contato */}
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Primeiro Contato
              </dt>
              <dd className="mt-1 text-sm text-foreground">
                {lead.firstTouchAt
                  ? fmt.date(lead.firstTouchAt)
                  : '—'}
              </dd>
            </div>

            {/* Contato (mascarado) */}
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Contato
              </dt>
              <dd className="mt-1 flex items-center gap-2">
                <span className="text-sm text-foreground" data-testid="lead-contact-info">
                  {contactDisplay ?? '—'}
                </span>
                {lead.contactInfo && !revealedContact && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRevealContact}
                    isLoading={isRevealing}
                    loadingText="Revelando..."
                    data-testid="lead-reveal-contact"
                  >
                    <Eye className="h-3.5 w-3.5" aria-hidden />
                    Revelar
                  </Button>
                )}
              </dd>
            </div>

            {/* Score do tema */}
            {themeScore !== undefined && themeScore !== null && (
              <div>
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Score do Tema
                </dt>
                <dd className="mt-1 text-sm font-semibold text-foreground" data-testid="lead-theme-score">
                  {themeScore}%
                </dd>
              </div>
            )}

            {/* Notas */}
            {lead.notes && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Notas
                </dt>
                <dd className="mt-1 text-sm text-foreground whitespace-pre-wrap">
                  {lead.notes}
                </dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Attribution Section */}
      <AttributionCard leadId={lead.id} themeId={lead.firstTouchThemeId} />

      {/* Conversions Section */}
      <div className="space-y-4" data-testid="lead-conversions-section">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Conversões</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(true)}
            data-testid="lead-add-conversion"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Registrar Conversão
          </Button>
        </div>

        <ConversionHistory
          leadId={lead.id}
          themeId={lead.firstTouchThemeId}
          refreshKey={refreshKey}
        />
      </div>

      {/* Conversion Form Modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Registrar Conversão"
        description="Adicione uma nova conversão para este lead."
        size="md"
      >
        <ConversionForm
          leadId={lead.id}
          themeId={lead.firstTouchThemeId}
          onSuccess={handleFormSuccess}
        />
      </Modal>
    </div>
  )
}
