'use client'

import { useState, useCallback, useEffect } from 'react'
import { Instagram, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { InstagramPreChecks } from '@/components/publishing/InstagramPreChecks'
import { RetryPublishButton } from '@/components/publishing/RetryPublishButton'
import { RateLimitCounter } from '@/components/publishing/RateLimitCounter'
import { UI_TIMING } from '@/constants/timing'

// TASK-12 ST004 (G-002) — consulta o kill-switch INSTAGRAM_PUBLISHING_LIVE
// via endpoint server-side. Polling 30s + chamada inicial. Fail-safe: erro =
// false (botao desabilitado por seguranca).
const KILL_SWITCH_POLL_MS = 30_000

function useInstagramPublishingEnabled(): boolean {
  const [enabled, setEnabled] = useState(true)
  useEffect(() => {
    let cancelled = false
    async function fetchStatus() {
      try {
        const res = await fetch('/api/instagram/publishing-enabled', { cache: 'no-store' })
        if (!res.ok) return
        const body = await res.json().catch(() => null)
        const next = !!(body?.data?.enabled ?? body?.enabled)
        if (!cancelled) setEnabled(next)
      } catch {
        if (!cancelled) setEnabled(false)
      }
    }
    fetchStatus()
    const id = window.setInterval(fetchStatus, KILL_SWITCH_POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])
  return enabled
}

type ButtonState = 'idle' | 'pre-checks' | 'confirming' | 'publishing' | 'done' | 'error'

interface InstagramPublishButtonProps {
  postId: string
  post: {
    approvedAt?: string | null
    imageUrl?: string | null
    caption: string
    channel: string
    status: string
    errorMessage?: string | null
  }
  onRetrySuccess?: () => void
}

export function InstagramPublishButton({ postId, post, onRetrySuccess }: InstagramPublishButtonProps) {
  const [state, setState] = useState<ButtonState>('idle')
  // TASK-15 ST006 (G-007) — bloqueia botao quando rate-limit Instagram saturou.
  const [rateLimitBlocked, setRateLimitBlocked] = useState(false)
  // TASK-12 ST004 (G-002) — kill-switch INSTAGRAM_PUBLISHING_LIVE.
  const publishingEnabled = useInstagramPublishingEnabled()

  const canOpen =
    !!post.approvedAt &&
    String(post.channel).toUpperCase() === 'INSTAGRAM' &&
    !rateLimitBlocked &&
    publishingEnabled

  const handleClick = useCallback(() => {
    if (!canOpen) return
    setState('pre-checks')
  }, [canOpen])

  const handlePreChecksConfirm = useCallback(() => {
    setState('confirming')
  }, [])

  const handlePreChecksClose = useCallback(() => {
    setState('idle')
  }, [])

  const handlePublish = useCallback(async () => {
    setState('publishing')
    try {
      const res = await fetch('/api/instagram/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const message = data?.error?.message ?? 'Erro ao publicar no Instagram'
        throw new Error(message)
      }

      setState('done')
      toast.success('Post publicado no Instagram!')
    } catch (err) {
      setState('error')
      const message = err instanceof Error ? err.message : 'Erro ao publicar'
      toast.error(message)
      // After error, go back to idle so user can retry
      setTimeout(() => setState('idle'), UI_TIMING.PUBLISH_STATE_RESET_MS)
    }
  }, [postId])

  const isDone = state === 'done'
  const isPublishing = state === 'publishing'

  // Normalize post for pre-checks (convert null to undefined)
  const preCheckPost = {
    approvedAt: post.approvedAt ?? undefined,
    imageUrl: post.imageUrl ?? undefined,
    caption: post.caption,
    channel: post.channel,
  }

  // TASK-4 ST003: exibir RetryPublishButton para posts FAILED (CL-129)
  if (post.status === 'FAILED') {
    return (
      <RetryPublishButton
        postId={postId}
        status={post.status}
        errorMessage={post.errorMessage}
        onSuccess={onRetrySuccess}
      />
    )
  }

  return (
    <>
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <Button
          onClick={handleClick}
          disabled={!canOpen || isDone || isPublishing}
          variant={isDone ? 'outline' : 'default'}
          isLoading={isPublishing}
          loadingText="Publicando..."
          title={
            !publishingEnabled
              ? 'Publicacao Instagram desativada pelo administrador (kill-switch ativo).'
              : rateLimitBlocked
                ? 'Limite de requisicoes Instagram atingido. Aguarde o reset.'
                : undefined
          }
        >
          {isDone ? (
            <>
              <Check className="h-4 w-4" />
              Publicado
            </>
          ) : isPublishing ? null : (
            <>
              <Instagram className="h-4 w-4" />
              Publicar no Instagram
            </>
          )}
        </Button>
        {/* TASK-15 ST006 (G-007) — contador visivel de rate-limit. */}
        <RateLimitCounter
          onChange={({ canPublish }) => setRateLimitBlocked(!canPublish)}
        />
      </div>

      {/* Pre-checks modal */}
      <InstagramPreChecks
        postId={postId}
        post={preCheckPost}
        open={state === 'pre-checks'}
        onClose={handlePreChecksClose}
        onConfirm={handlePreChecksConfirm}
      />

      {/* Confirmation modal */}
      <Modal
        open={state === 'confirming'}
        onClose={() => setState('idle')}
        title="Confirmar publicação no Instagram"
        description="Tem certeza que deseja publicar este post no Instagram? Esta ação não pode ser desfeita."
        confirmLabel="Publicar"
        cancelLabel="Cancelar"
        onConfirm={handlePublish}
      />
    </>
  )
}
