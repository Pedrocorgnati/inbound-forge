'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, Instagram, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SkeletonCard } from '@/components/ui/skeleton'
import { PUBLISHING_CHANNELS } from '@/lib/constants/publishing'
import { uuidv7 } from '@/lib/utils/uuidv7'
import { InstagramPreview } from './InstagramPreview'
import { HashtagsPanel } from './HashtagsPanel'
import {
  ScheduleSelector,
  getDefaultInstagramScheduleValue,
  isInstagramScheduleInsideWindow,
} from './ScheduleSelector'

interface InstagramPublisherPanelProps {
  postId: string
}

interface InstagramPostPayload {
  id: string
  channel: string
  status: string
  caption: string
  hashtags: string[]
  imageUrl: string | null
  scheduledAt: string | null
  approvedAt: string | null
  errorMessage?: string | null
  contentPiece?: {
    painCategory?: string | null
    targetNiche?: string | null
    theme?: {
      title?: string | null
      pain?: {
        title?: string | null
        description?: string | null
      } | null
    } | null
  } | null
}

type PublishState = 'idle' | 'saving' | 'approving' | 'publishing' | 'done' | 'error'

const MAX_CAPTION = PUBLISHING_CHANNELS.INSTAGRAM.maxCaptionLength
const MAX_HASHTAGS = PUBLISHING_CHANNELS.INSTAGRAM.maxHashtags

// fix REPROVADO TAREFA-008: o backend agora exige Idempotency-Key em UUID v7
// (validado por src/lib/idempotency/middleware.ts). O formato anterior
// `instagram-{postId}-{uuid}` era rejeitado (ERR-061). Uma chave por clique de
// publicacao basta para o dedup de 24h.
function getIdempotencyKey(): string {
  return uuidv7()
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

export function InstagramPublisherPanel({ postId }: InstagramPublisherPanelProps) {
  const [post, setPost] = useState<InstagramPostPayload | null>(null)
  const [hashtags, setHashtags] = useState<string[]>([])
  const [scheduleValue, setScheduleValue] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [state, setState] = useState<PublishState>('idle')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/v1/posts/${postId}`, { cache: 'no-store' })
        const json = await res.json().catch(() => null)
        if (!res.ok) throw new Error(getErrorMessage(json, 'Erro ao carregar post'))
        const payload: InstagramPostPayload = json?.data ?? json
        if (cancelled) return
        setPost(payload)
        setHashtags((payload.hashtags ?? []).map((tag) => tag.replace(/^#/, '')))
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

  const painTitle = post?.contentPiece?.theme?.pain?.title ?? post?.contentPiece?.painCategory ?? null
  const targetNiche = post?.contentPiece?.targetNiche ?? null
  const captionLength = post?.caption.length ?? 0
  const captionOk = captionLength <= MAX_CAPTION
  const imageOk = !!post?.imageUrl
  const hashtagsOk = hashtags.length <= MAX_HASHTAGS
  const scheduleOk = isInstagramScheduleInsideWindow(scheduleValue)
  const channelOk = String(post?.channel ?? '').toUpperCase() === 'INSTAGRAM'
  const publishDisabled = !post || !captionOk || !imageOk || !hashtagsOk || !scheduleOk || !channelOk || state === 'publishing' || state === 'saving' || state === 'approving'
  const statusLabel = state === 'saving'
    ? 'Salvando ajustes...'
    : state === 'approving'
      ? 'Aprovando...'
      : state === 'publishing'
        ? 'Publicando...'
        : state === 'done'
          ? 'Publicado'
          : 'Aprovar e publicar'

  const checks = useMemo(() => [
    { label: `Imagem 1080x1350 disponível`, ok: imageOk },
    { label: `Legenda dentro de ${MAX_CAPTION} caracteres`, ok: captionOk },
    { label: `Até ${MAX_HASHTAGS} hashtags`, ok: hashtagsOk },
    { label: 'Horário dentro da janela operacional', ok: scheduleOk },
    { label: 'Canal Instagram', ok: channelOk },
  ], [captionOk, channelOk, hashtagsOk, imageOk, scheduleOk])

  async function saveDraft() {
    const scheduledAt = new Date(scheduleValue).toISOString()
    const res = await fetch(`/api/v1/posts/${postId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hashtags, scheduledAt }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) throw new Error(getErrorMessage(json, 'Erro ao salvar ajustes'))
    const updated: InstagramPostPayload = json?.data ?? json
    setPost((current) => current ? { ...current, ...updated } : updated)
  }

  async function approveIfNeeded() {
    if (post?.approvedAt) return
    // /approve embrulha o handler em withIdempotency (400 sem Idempotency-Key).
    const res = await fetch(`/api/v1/posts/${postId}/approve`, {
      method: 'POST',
      headers: { 'Idempotency-Key': getIdempotencyKey() },
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) throw new Error(getErrorMessage(json, 'Erro ao aprovar post'))
    const updated: InstagramPostPayload = json?.data ?? json
    setPost((current) => current ? { ...current, ...updated } : updated)
  }

  async function publish() {
    const res = await fetch('/api/instagram/publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': getIdempotencyKey(),
      },
      body: JSON.stringify({ postId }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) throw new Error(getErrorMessage(json, 'Erro ao publicar no Instagram'))
    const updated: InstagramPostPayload = json?.data?.post ?? json?.data ?? json
    setPost((current) => current ? { ...current, ...updated, status: 'PUBLISHED' } : updated)
  }

  async function handleApproveAndPublish() {
    if (publishDisabled) return
    setState('saving')
    try {
      await saveDraft()
      setState('approving')
      await approveIfNeeded()
      setState('publishing')
      await publish()
      setState('done')
      toast.success('Post publicado no Instagram')
    } catch (error) {
      setState('error')
      toast.error(error instanceof Error ? error.message : 'Falha ao publicar no Instagram')
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,520px)_minmax(360px,1fr)]">
      <InstagramPreview
        caption={post.caption}
        hashtags={hashtags}
        imageUrl={post.imageUrl}
      />

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Validação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-2">
              {checks.map((check) => (
                <li key={check.label} className="flex items-center gap-2 text-sm">
                  {check.ok ? (
                    <Check className="h-4 w-4 shrink-0 text-green-600" aria-hidden />
                  ) : (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-600" aria-hidden />
                  )}
                  <span className={check.ok ? 'text-green-700' : 'text-yellow-700'}>
                    {check.label}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              {captionLength}/{MAX_CAPTION} caracteres na legenda.
            </p>
          </CardContent>
        </Card>

        <HashtagsPanel
          hashtags={hashtags}
          painTitle={painTitle}
          targetNiche={targetNiche}
          onChange={setHashtags}
        />

        <ScheduleSelector value={scheduleValue} onChange={setScheduleValue} />

        {state === 'error' && post.errorMessage && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {post.errorMessage}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={handleApproveAndPublish}
            disabled={publishDisabled || state === 'done'}
            isLoading={state === 'saving' || state === 'approving' || state === 'publishing'}
            loadingText={statusLabel}
          >
            {state === 'done' ? (
              <>
                <Check className="h-4 w-4" aria-hidden />
                Publicado
              </>
            ) : state === 'saving' || state === 'approving' || state === 'publishing' ? null : (
              <>
                <Instagram className="h-4 w-4" aria-hidden />
                Aprovar e publicar
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
