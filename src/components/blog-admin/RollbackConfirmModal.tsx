'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/modal'
import { DiffViewer } from './DiffViewer'
import type { BlogArticleVersion } from '@/types/blog'
import { formatDateTime } from '@/lib/utils'

interface RollbackConfirmModalProps {
  open: boolean
  onClose: () => void
  articleId: string
  version: BlogArticleVersion
  currentTitle: string
  currentBody: string
  onRollbackSuccess?: () => void
}

export function RollbackConfirmModal({
  open,
  onClose,
  articleId,
  version,
  currentTitle,
  currentBody,
  onRollbackSuccess,
}: RollbackConfirmModalProps) {
  async function handleConfirm() {
    const res = await fetch(`/api/blog-articles/${articleId}/rollback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ versionId: version.id }),
    })

    if (!res.ok) {
      toast.error(`Erro ao realizar rollback`)
      throw new Error('Rollback failed')
    }

    toast.success(`Rollback realizado para v${version.versionNumber}`)
    onRollbackSuccess?.()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Confirmar rollback para versao ${version.versionNumber}?`}
      size="lg"
      onConfirm={handleConfirm}
      confirmLabel="Confirmar Rollback"
      cancelLabel="Cancelar"
      isDestructive
    >
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground space-y-1">
          <p>
            <span className="font-medium">Data:</span>{' '}
            {formatDateTime(version.createdAt)}
          </p>
          {version.changeNote && (
            <p>
              <span className="font-medium">Nota:</span> {version.changeNote}
            </p>
          )}
        </div>

        <div className="max-h-[240px] overflow-y-auto rounded-md border border-border p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Diferencas do titulo
          </p>
          <DiffViewer before={currentTitle} after={version.title} />
        </div>

        <div className="max-h-[240px] overflow-y-auto rounded-md border border-border p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Diferenças do conteúdo
          </p>
          <DiffViewer before={currentBody} after={version.body} />
        </div>

        <p className="rounded-md bg-warning-bg p-3 text-sm text-[#92400E]">
          Esta ação criará uma nova versão com o conteúdo de v
          {version.versionNumber}. O histórico NÃO será perdido.
        </p>
      </div>
    </Modal>
  )
}
