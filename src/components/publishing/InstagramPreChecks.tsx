'use client'

import { useState, useEffect } from 'react'
import { Check, X, AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { INSTAGRAM_RATE_LIMITS, PUBLISHING_CHANNELS } from '@/lib/constants/publishing'

interface InstagramPreChecksProps {
  postId: string
  post: {
    approvedAt?: string
    imageUrl?: string
    caption: string
    channel: string
  }
  open: boolean
  onClose: () => void
  onConfirm: () => void
}

interface InstagramStatus {
  canPublish: boolean
  requestsUsed: number
  postsToday: number
  tokenValid: boolean
  tokenExpiresSoon: boolean
  tokenExpiresAt: string | null
}

const MAX_CAPTION = PUBLISHING_CHANNELS.INSTAGRAM.maxCaptionLength

export function InstagramPreChecks({
  postId: _postId,
  post,
  open,
  onClose,
  onConfirm,
}: InstagramPreChecksProps) {
  const [status, setStatus] = useState<InstagramStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!open) {
      setStatus(null)
      return
    }

    async function fetchStatus() {
      setIsLoading(true)
      try {
        const res = await fetch('/api/instagram/status')
        if (!res.ok) throw new Error('Erro ao verificar status')
        const json = await res.json()
        setStatus(json.data ?? json)
      } catch {
        setStatus(null)
      } finally {
        setIsLoading(false)
      }
    }
    fetchStatus()
  }, [open])

  const isApproved = !!post.approvedAt
  const hasImage = !!post.imageUrl
  const captionLength = post.caption.length
  const captionOk = captionLength <= MAX_CAPTION
  const captionClose = captionLength > MAX_CAPTION * 0.9

  const rateOk = status?.canPublish ?? false
  const tokenOk = status?.tokenValid ?? false
  const tokenExpiring = status?.tokenExpiresSoon ?? false

  const hasBlocking =
    !isApproved ||
    !hasImage ||
    !rateOk ||
    (!tokenOk) ||
    !captionOk

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pre-verificacao do Instagram"
      size="md"
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Verificando...</span>
        </div>
      ) : (
        <div className="space-y-4">
          <ul className="space-y-3">
            {/* Post aprovado */}
            <CheckRow
              status={isApproved ? 'ok' : 'error'}
              label={isApproved ? 'Post aprovado' : 'Post não aprovado (bloqueante)'}
            />

            {/* Imagem */}
            <CheckRow
              status={hasImage ? 'ok' : 'error'}
              label={hasImage ? 'Imagem disponível' : 'Imagem não disponível (bloqueante)'}
            />

            {/* Rate limit */}
            <CheckRow
              status={rateOk ? 'ok' : 'error'}
              label={
                status
                  ? `Rate limit: ${status.requestsUsed}/${INSTAGRAM_RATE_LIMITS.requestsPerHour} req/h, ${status.postsToday}/${INSTAGRAM_RATE_LIMITS.postsPerDay} posts/dia`
                  : 'Rate limit: indisponivel'
              }
            />

            {/* Token */}
            <CheckRow
              status={!tokenOk ? 'error' : tokenExpiring ? 'warn' : 'ok'}
              label={
                !tokenOk
                  ? 'Token expirado (bloqueante)'
                  : tokenExpiring
                    ? 'Token valido, expirando em breve'
                    : 'Token valido'
              }
            />

            {/* Legenda */}
            <CheckRow
              status={!captionOk ? 'error' : captionClose ? 'warn' : 'ok'}
              label={`Legenda: ${captionLength}/${MAX_CAPTION} caracteres`}
            />
          </ul>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={onConfirm} disabled={hasBlocking}>
              Publicar no Instagram
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function CheckRow({
  status,
  label,
}: {
  status: 'ok' | 'warn' | 'error'
  label: string
}) {
  return (
    <li className="flex items-start gap-2 text-sm">
      {status === 'ok' && <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />}
      {status === 'warn' && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />}
      {status === 'error' && <X className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />}
      <span
        className={cn(
          status === 'ok' && 'text-green-700',
          status === 'warn' && 'text-yellow-700',
          status === 'error' && 'text-red-600'
        )}
      >
        {label}
      </span>
    </li>
  )
}
