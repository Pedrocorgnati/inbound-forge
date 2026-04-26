'use client'

/**
 * ContentDeleteButton — TASK-13 ST005 (CL-239)
 *
 * Botao para deletar uma ContentPiece em rascunho. Usa o ConfirmDialog canonico
 * (TASK-1) e chama DELETE /api/v1/content/[pieceId]. Desabilita se status != DRAFT.
 */

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export interface ContentDeleteButtonProps {
  piece: { id: string; status: string; baseTitle?: string | null }
  onDeleted?: (pieceId: string) => void
  className?: string
  size?: 'sm' | 'default' | 'lg'
}

export function ContentDeleteButton({
  piece,
  onDeleted,
  className,
  size = 'sm',
}: ContentDeleteButtonProps) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const isDraft = piece.status === 'DRAFT'

  async function handleConfirm() {
    if (!isDraft) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/v1/content/${piece.id}`, { method: 'DELETE' })
      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        const msg =
          payload?.error ??
          (res.status === 409 ? 'Somente rascunhos podem ser deletados.' : 'Falha ao deletar conteúdo')
        toast.error(msg)
        return
      }
      toast.success('Rascunho deletado com sucesso')
      onDeleted?.(piece.id)
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size={size}
        disabled={!isDraft || deleting}
        aria-label={isDraft ? 'Deletar rascunho' : 'Apenas rascunhos podem ser deletados'}
        title={isDraft ? 'Deletar rascunho' : 'Apenas rascunhos podem ser deletados'}
        onClick={() => setOpen(true)}
        className={className}
      >
        <Trash2 className="h-4 w-4" aria-hidden />
        <span className="ml-1.5">Deletar</span>
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Deletar rascunho?"
        description={`Esta ação é irreversível. O rascunho "${piece.baseTitle ?? piece.id}" será removido permanentemente.`}
        confirmLabel={deleting ? 'Deletando...' : 'Deletar'}
        cancelLabel="Cancelar"
        variant="destructive"
        onConfirm={handleConfirm}
      />
    </>
  )
}
