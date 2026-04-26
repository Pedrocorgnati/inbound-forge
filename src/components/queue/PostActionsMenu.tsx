'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import { RollbackConfirmModal } from './RollbackConfirmModal'
import { PublishErrorDrawer } from '@/components/publishing/PublishErrorDrawer'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

type Status = 'DRAFT' | 'REVIEW' | 'APPROVED' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED' | 'PENDING_ART' | 'ROLLED_BACK' | 'CANCELLED'

type Props = {
  postId: string
  status: Status
  caption: string
  imageUrl?: string | null
  onChanged?: () => void
}

export function PostActionsMenu({ postId, status, caption, imageUrl, onChanged }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [rollbackOpen, setRollbackOpen] = useState(false)
  const [errorsOpen, setErrorsOpen] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const canViewErrors = status === 'FAILED'

  const canRollback = status === 'PUBLISHED'

  const canCancel = status === 'SCHEDULED' || status === 'APPROVED' || status === 'PENDING_ART'

  async function handleCancelConfirm() {
    setCancelling(true)
    try {
      const res = await apiClient(`/api/v1/posts/${postId}/cancel`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      toast.success('Publicacao cancelada')
      setCancelOpen(false)
      onChanged?.()
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao cancelar')
    } finally {
      setCancelling(false)
    }
  }

  async function handleDuplicate() {
    setOpen(false)
    setDuplicating(true)
    try {
      const res = await apiClient(`/api/v1/posts/${postId}/duplicate`, { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { post: { id: string } }
      toast.success('Post duplicado')
      onChanged?.()
      router.push(`/queue/${data.post.id}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao duplicar')
    } finally {
      setDuplicating(false)
    }
  }

  return (
    <div className="relative inline-block text-sm">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="rounded border px-2 py-1"
        data-testid={`post-actions-${postId}`}
      >
        ...
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-44 rounded border bg-white shadow"
        >
          <button
            type="button"
            role="menuitem"
            disabled={duplicating}
            onClick={() => void handleDuplicate()}
            className="block w-full px-3 py-2 text-left hover:bg-gray-50 disabled:opacity-50"
          >
            {duplicating ? 'Duplicando…' : 'Duplicar'}
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!canViewErrors}
            onClick={() => {
              setOpen(false)
              setErrorsOpen(true)
            }}
            className="block w-full px-3 py-2 text-left hover:bg-gray-50 disabled:opacity-50"
          >
            Ver erros
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!canRollback}
            onClick={() => {
              setOpen(false)
              setRollbackOpen(true)
            }}
            className="block w-full px-3 py-2 text-left text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Reverter publicacao
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!canCancel}
            data-testid={`post-cancel-${postId}`}
            onClick={() => {
              setOpen(false)
              setCancelOpen(true)
            }}
            className="block w-full px-3 py-2 text-left text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Cancelar publicacao
          </button>
        </div>
      )}

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => (cancelling ? undefined : setCancelOpen(false))}
        onConfirm={handleCancelConfirm}
        title="Cancelar publicacao?"
        message="O post deixara de ser publicado. Esta acao gera um registro de auditoria."
        confirmText={cancelling ? 'Cancelando...' : 'Cancelar publicacao'}
        cancelText="Voltar"
        variant="danger"
      />

      <PublishErrorDrawer postId={postId} open={errorsOpen} onClose={() => setErrorsOpen(false)} />

      <RollbackConfirmModal
        postId={postId}
        postPreview={{ caption, imageUrl }}
        open={rollbackOpen}
        onClose={() => setRollbackOpen(false)}
        onSuccess={() => onChanged?.()}
      />
    </div>
  )
}
