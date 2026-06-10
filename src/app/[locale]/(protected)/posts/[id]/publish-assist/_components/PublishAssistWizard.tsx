'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Link2,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { SkeletonCard } from '@/components/ui/skeleton'
import { CopyButton } from '@/components/ui/copy-button'
import { PUBLISHING_CHANNELS } from '@/lib/constants/publishing'
import { UTM_MEDIUMS, UTM_SOURCES } from '@/constants/utm-constants'
import {
  ScheduleSelector,
  getDefaultInstagramScheduleValue,
  isInstagramScheduleInsideWindow,
} from '../../instagram/_components/ScheduleSelector'

interface PublishAssistWizardProps {
  postId: string
}

interface PostPayload {
  id: string
  channel: string
  status: string
  caption: string
  hashtags: string[]
  imageUrl: string | null
  scheduledAt: string | null
  approvedAt: string | null
}

type ChannelKey = keyof typeof PUBLISHING_CHANNELS

const STEPS: { key: string; title: string }[] = [
  { key: 'review', title: 'Revisar' },
  { key: 'channel', title: 'Escolher canal' },
  { key: 'utm', title: 'Gerar UTM' },
  { key: 'schedule', title: 'Agendar' },
]

const TOTAL_STEPS = STEPS.length

const CHANNEL_MEDIUM: Record<ChannelKey, string> = {
  INSTAGRAM: UTM_MEDIUMS.INSTAGRAM,
  LINKEDIN: UTM_MEDIUMS.LINKEDIN,
  BLOG: UTM_MEDIUMS.BLOG,
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object') {
    const data = payload as { error?: unknown; message?: unknown }
    if (typeof data.error === 'string') return data.error
    if (typeof data.message === 'string') return data.message
    if (data.error && typeof data.error === 'object' && 'message' in data.error) {
      const message = (data.error as { message?: unknown }).message
      if (typeof message === 'string') return message
    }
  }
  return fallback
}

function clampStep(raw: string | null, max: number): number {
  const parsed = Number.parseInt(raw ?? '1', 10)
  if (Number.isNaN(parsed)) return 1
  return Math.min(Math.max(parsed, 1), max)
}

export function PublishAssistWizard({ postId }: PublishAssistWizardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [post, setPost] = useState<PostPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [channel, setChannel] = useState<ChannelKey | ''>('')
  const [utmCampaign, setUtmCampaign] = useState('')
  const [utmContent, setUtmContent] = useState('')
  const [utmUrl, setUtmUrl] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [scheduleValue, setScheduleValue] = useState('')
  const [scheduling, setScheduling] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/v1/posts/${postId}`, { cache: 'no-store' })
        const json = await res.json().catch(() => null)
        if (!res.ok) throw new Error(getErrorMessage(json, 'Erro ao carregar post'))
        const payload: PostPayload = json?.data ?? json
        if (cancelled) return
        setPost(payload)
        const upper = String(payload.channel ?? '').toUpperCase()
        setChannel((upper in PUBLISHING_CHANNELS ? (upper as ChannelKey) : 'INSTAGRAM'))
        setUtmCampaign(payload.id)
        setScheduleValue(getDefaultInstagramScheduleValue(payload.scheduledAt))
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Erro ao carregar post')
          setPost(null)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [postId])

  // Validacao step-a-step (cumulativa).
  const step1Valid = !!post && post.caption.trim().length > 0
  const step2Valid = !!channel
  const step3Valid = !!utmUrl
  const step4Valid = isInstagramScheduleInsideWindow(scheduleValue)

  const stepValid = useMemo(
    () => [step1Valid, step2Valid, step3Valid, step4Valid],
    [step1Valid, step2Valid, step3Valid, step4Valid],
  )

  // Maior passo navegavel: passo N exige passos 1..N-1 validos.
  const maxReachable = useMemo(() => {
    let reach = 1
    for (let i = 0; i < TOTAL_STEPS - 1; i += 1) {
      if (stepValid[i]) reach = i + 2
      else break
    }
    return reach
  }, [stepValid])

  const requestedStep = clampStep(searchParams.get('step'), TOTAL_STEPS)
  const currentStep = Math.min(requestedStep, maxReachable)

  const goToStep = useCallback(
    (n: number) => {
      const target = Math.min(Math.max(n, 1), TOTAL_STEPS)
      const params = new URLSearchParams(searchParams.toString())
      params.set('step', String(target))
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  // Se o passo pedido na URL exceder o navegavel, normaliza a URL (deep-link defensivo).
  useEffect(() => {
    if (!isLoading && requestedStep > maxReachable) {
      goToStep(maxReachable)
    }
  }, [goToStep, isLoading, maxReachable, requestedStep])

  const currentStepValid = stepValid[currentStep - 1]

  async function generateUtm() {
    if (!channel) return
    setGenerating(true)
    try {
      const body: Record<string, string> = {
        postId,
        source: UTM_SOURCES.INBOUND_FORGE,
        medium: CHANNEL_MEDIUM[channel],
        campaign: utmCampaign.trim(),
      }
      if (utmContent.trim()) body.content = utmContent.trim()

      const res = await fetch('/api/v1/utm-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })

      if (res.status === 409) {
        const existingRes = await fetch(`/api/v1/utm-links/${postId}`, { cache: 'no-store' })
        const existingJson = await existingRes.json().catch(() => null)
        if (!existingRes.ok) throw new Error(getErrorMessage(existingJson, 'Erro ao recuperar UTM existente'))
        const existing = existingJson?.data ?? existingJson
        setUtmUrl(existing.fullUrl ?? null)
        toast.info('Este post já tinha um link UTM; reutilizando o existente.')
        return
      }

      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(getErrorMessage(json, 'Erro ao gerar link UTM'))
      const created = json?.data ?? json
      setUtmUrl(created.fullUrl ?? null)
      toast.success('Link UTM gerado.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao gerar link UTM')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSchedule() {
    if (!step4Valid) return
    setScheduling(true)
    try {
      const scheduledAt = new Date(scheduleValue).toISOString()
      const res = await fetch(`/api/v1/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ scheduledAt }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(getErrorMessage(json, 'Erro ao agendar publicação'))
      const updated: PostPayload = json?.data ?? json
      setPost((current) => (current ? { ...current, ...updated } : updated))
      setDone(true)
      toast.success('Publicação agendada.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao agendar publicação')
    } finally {
      setScheduling(false)
    }
  }

  if (isLoading) return <SkeletonCard />

  if (!post) {
    return (
      <Card>
        <CardContent className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
          <AlertTriangle className="h-6 w-6 text-yellow-600" aria-hidden />
          <p className="text-sm text-muted-foreground">Não foi possível carregar este post.</p>
          <Button type="button" variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" aria-hidden />
            Recarregar
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Stepper currentStep={currentStep} maxReachable={maxReachable} onSelect={goToStep} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Passo {currentStep} de {TOTAL_STEPS}: {STEPS[currentStep - 1].title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentStep === 1 && <ReviewStep post={post} />}

          {currentStep === 2 && (
            <Select
              label="Canal de publicação"
              value={channel}
              onChange={(event) => {
                setChannel(event.target.value as ChannelKey)
                setUtmUrl(null)
              }}
              helperText="Define o utm_medium do link gerado no próximo passo."
              options={(Object.keys(PUBLISHING_CHANNELS) as ChannelKey[]).map((key) => ({
                value: key,
                label: PUBLISHING_CHANNELS[key].label,
              }))}
            />
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <Input
                label="Campanha (utm_campaign)"
                value={utmCampaign}
                onChange={(event) => setUtmCampaign(event.target.value)}
                placeholder="ex: lancamento-q2"
              />
              <Input
                label="Conteúdo (utm_content) — opcional"
                value={utmContent}
                onChange={(event) => setUtmContent(event.target.value)}
                placeholder="ex: variacao-a"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={generateUtm}
                disabled={!utmCampaign.trim() || generating}
                isLoading={generating}
                loadingText="Gerando link..."
              >
                <Link2 className="h-4 w-4" aria-hidden />
                {utmUrl ? 'Regenerar link UTM' : 'Gerar link UTM'}
              </Button>

              {utmUrl && (
                <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3">
                  <p className="text-xs font-medium text-muted-foreground">Link rastreável</p>
                  <div className="flex items-start gap-2">
                    <code className="break-all text-xs text-foreground">{utmUrl}</code>
                    <CopyButton textToCopy={utmUrl} size="sm" />
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <ScheduleSelector value={scheduleValue} onChange={setScheduleValue} />
              {done && (
                <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                  <Check className="h-4 w-4" aria-hidden />
                  Publicação agendada com sucesso.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => goToStep(currentStep - 1)}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Voltar
        </Button>

        {currentStep < TOTAL_STEPS ? (
          <Button
            type="button"
            onClick={() => goToStep(currentStep + 1)}
            disabled={!currentStepValid}
          >
            Avançar
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSchedule}
            disabled={!step4Valid || scheduling || done}
            isLoading={scheduling}
            loadingText="Agendando..."
          >
            {done ? (
              <>
                <Check className="h-4 w-4" aria-hidden />
                Agendado
              </>
            ) : (
              'Agendar publicação'
            )}
          </Button>
        )}
      </div>

      {!currentStepValid && currentStep < TOTAL_STEPS && (
        <p className="text-xs text-muted-foreground">
          {currentStep === 3
            ? 'Gere o link UTM para liberar o próximo passo.'
            : 'Conclua este passo para avançar.'}
        </p>
      )}

      <p className="sr-only" aria-live="polite">
        Passo {currentStep} de {TOTAL_STEPS}: {STEPS[currentStep - 1].title}
      </p>
    </div>
  )
}

function Stepper({
  currentStep,
  maxReachable,
  onSelect,
}: {
  currentStep: number
  maxReachable: number
  onSelect: (n: number) => void
}) {
  return (
    <ol className="flex flex-wrap gap-2" aria-label="Progresso do assistente">
      {STEPS.map((step, index) => {
        const n = index + 1
        const reachable = n <= maxReachable
        const isCurrent = n === currentStep
        const isComplete = n < currentStep
        return (
          <li key={step.key} className="flex-1 min-w-[140px]">
            <button
              type="button"
              onClick={() => reachable && onSelect(n)}
              disabled={!reachable}
              aria-current={isCurrent ? 'step' : undefined}
              className={[
                'flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors',
                isCurrent
                  ? 'border-primary bg-primary/10 font-medium text-foreground'
                  : reachable
                    ? 'border-border hover:bg-muted'
                    : 'border-border opacity-50',
              ].join(' ')}
            >
              <span
                className={[
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs',
                  isComplete
                    ? 'bg-green-600 text-white'
                    : isCurrent
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground',
                ].join(' ')}
              >
                {isComplete ? <Check className="h-3.5 w-3.5" aria-hidden /> : n}
              </span>
              <span className="truncate">{step.title}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

interface ObjectionItem {
  id: string
  content: string
  type: string
}

const OBJECTION_TYPE_LABEL: Record<string, string> = {
  PRICE: 'Preço',
  TRUST: 'Confiança',
  TIMING: 'Momento',
  NEED: 'Necessidade',
  AUTHORITY: 'Autoridade',
}

/**
 * fix REPROVADO (finding TASK-015): cruzamento objections -> publish. O assistente de
 * publicacao agora surfaca a biblioteca de objecoes (agrupada por tipo) no passo de
 * revisao, para o operador conferir se a copy do post enderecou as objecoes comuns
 * antes de publicar. Espelha o padrao de surfacing de conhecimento (pains em
 * themes/[id], patterns em CopyContextButton). Estados loading/empty/error tratados.
 */
function ObjectionsReview() {
  const [objections, setObjections] = useState<ObjectionItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      setIsLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/v1/knowledge/objections?limit=100')
        if (!res.ok) throw new Error('load')
        const json = await res.json()
        if (active) setObjections((json.data ?? []) as ObjectionItem[])
      } catch {
        if (active) setError('Não foi possível carregar as objeções.')
      } finally {
        if (active) setIsLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const grouped = useMemo(() => {
    const map = new Map<string, ObjectionItem[]>()
    for (const o of objections) {
      const arr = map.get(o.type) ?? []
      arr.push(o)
      map.set(o.type, arr)
    }
    return Array.from(map.entries())
  }, [objections])

  return (
    <div className="rounded-md border border-border p-3" data-testid="publish-objections-review">
      <p className="text-xs font-medium text-muted-foreground">
        Objeções a enderecar (biblioteca)
      </p>
      {isLoading && (
        <p className="mt-2 text-sm text-muted-foreground" data-testid="publish-objections-loading">
          Carregando objeções...
        </p>
      )}
      {error && !isLoading && (
        <p className="mt-2 flex items-center gap-2 text-sm text-danger" role="alert">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
      {!isLoading && !error && objections.length === 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          Nenhuma objeção cadastrada ainda na biblioteca de conhecimento.
        </p>
      )}
      {!isLoading && !error && objections.length > 0 && (
        <div className="mt-2 space-y-3">
          {grouped.map(([type, items]) => (
            <div key={type}>
              <p className="text-xs font-semibold text-foreground">
                {OBJECTION_TYPE_LABEL[type] ?? type}
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {items.map((o) => (
                  <li key={o.id} className="text-sm text-muted-foreground">
                    {o.content}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ReviewStep({ post }: { post: PostPayload }) {
  const fields: { label: string; value: string }[] = [
    { label: 'Canal atual', value: PUBLISHING_CHANNELS[post.channel?.toUpperCase() as ChannelKey]?.label ?? post.channel },
    { label: 'Status', value: post.status },
    { label: 'Hashtags', value: post.hashtags?.length ? post.hashtags.map((t) => `#${t.replace(/^#/, '')}`).join(' ') : '—' },
    { label: 'Imagem', value: post.imageUrl ? 'Disponível' : 'Sem imagem' },
  ]

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-muted-foreground">Legenda</p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
          {post.caption?.trim() ? post.caption : 'Sem legenda definida.'}
        </p>
      </div>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.label} className="rounded-md border border-border p-3">
            <dt className="text-xs text-muted-foreground">{field.label}</dt>
            <dd className="mt-1 break-words text-sm text-foreground">{field.value}</dd>
          </div>
        ))}
      </dl>
      <ObjectionsReview />
      {!post.caption?.trim() && (
        <div className="flex items-center gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          Defina a legenda do post antes de prosseguir.
        </div>
      )}
    </div>
  )
}
