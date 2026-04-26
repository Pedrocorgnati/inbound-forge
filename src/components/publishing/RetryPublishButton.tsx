'use client'

/**
 * RetryPublishButton — Inbound Forge
 * TASK-4 ST003 / intake-review Sad Paths UI
 *
 * Botão de re-tentativa para posts Instagram com status FAILED (CL-129).
 * Só exibido quando Post.status === 'FAILED'.
 */
import { useState } from 'react'
import { RefreshCw, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { PublishErrorDrawer } from './PublishErrorDrawer'

interface RetryPublishButtonProps {
  postId: string
  status: string
  errorMessage?: string | null
  onSuccess?: () => void
}

export function RetryPublishButton({ postId, status, errorMessage, onSuccess }: RetryPublishButtonProps) {
  const [isRetrying, setIsRetrying] = useState(false)
  const [errorsOpen, setErrorsOpen] = useState(false)

  if (status !== 'FAILED') return null

  async function handleRetry(reuseContent = true) {
    setIsRetrying(true)
    try {
      // TASK-2/ST003 (CL-135): por padrao reutiliza conteudo Claude ja gerado.
      const url = reuseContent ? `/api/v1/posts/${postId}/republish` : '/api/instagram/publish'
      const body = reuseContent ? undefined : JSON.stringify({ postId })
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        credentials: 'include',
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error?.message ?? 'Falha ao republicar')
      }

      toast.success(reuseContent ? 'Post re-enfileirado (conteudo reutilizado)' : 'Post reenviado para publicação!')
      onSuccess?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao tentar publicar novamente'
      toast.error(msg)
    } finally {
      setIsRetrying(false)
    }
  }

  return (
    <div className="flex gap-1.5">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleRetry(true)}
        disabled={isRetrying}
        title={errorMessage ? `Erro anterior: ${errorMessage}` : 'Republicar reutilizando conteudo'}
        className="gap-1.5 border-yellow-300 text-yellow-700 hover:bg-yellow-50 hover:border-yellow-400"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isRetrying ? 'animate-spin' : ''}`} aria-hidden />
        {isRetrying ? 'Reenviando...' : 'Republicar (mesmo conteudo)'}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleRetry(false)}
        disabled={isRetrying}
        title="Regenerar e publicar (consome Claude)"
      >
        Regenerar
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setErrorsOpen(true)}
        title="Ver historico de falhas"
        className="gap-1.5"
      >
        <AlertCircle className="h-3.5 w-3.5" aria-hidden />
        Ver erros
      </Button>
      <PublishErrorDrawer postId={postId} open={errorsOpen} onClose={() => setErrorsOpen(false)} />
    </div>
  )
}
