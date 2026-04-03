'use client'

import { useState, useCallback } from 'react'
import { Instagram, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { InstagramPreChecks } from '@/components/publishing/InstagramPreChecks'

type ButtonState = 'idle' | 'pre-checks' | 'confirming' | 'publishing' | 'done' | 'error'

interface InstagramPublishButtonProps {
  postId: string
  post: {
    approvedAt?: string | null
    imageUrl?: string | null
    caption: string
    channel: string
    status: string
  }
}

export function InstagramPublishButton({ postId, post }: InstagramPublishButtonProps) {
  const [state, setState] = useState<ButtonState>('idle')

  const canOpen = !!post.approvedAt && post.channel === 'instagram'

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
      setTimeout(() => setState('idle'), 2000)
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

  return (
    <>
      <Button
        onClick={handleClick}
        disabled={!canOpen || isDone || isPublishing}
        variant={isDone ? 'outline' : 'default'}
        isLoading={isPublishing}
        loadingText="Publicando..."
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
        title="Confirmar publicacao no Instagram"
        description="Tem certeza que deseja publicar este post no Instagram? Esta acao nao pode ser desfeita."
        confirmLabel="Publicar"
        cancelLabel="Cancelar"
        onConfirm={handlePublish}
      />
    </>
  )
}
