'use client'

// Intake Review TASK-9 ST004 (CL-264) — dialog para mesclar tag source em target.

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { apiClient } from '@/lib/api-client'
import type { TagRow } from './TagsAdminTable'

interface TagMergeDialogProps {
  source: TagRow
  tags: TagRow[]
  open: boolean
  onClose: () => void
  onMerged?: () => void
}

export function TagMergeDialog({ source, tags, open, onClose, onMerged }: TagMergeDialogProps) {
  const [targetId, setTargetId] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!targetId) {
      setError('Selecione uma tag de destino')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await apiClient('/api/v1/blog/tags/merge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sourceId: source.id, targetId }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(body?.message ?? 'Falha ao mesclar')
      }
      onMerged?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao mesclar')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[90%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-lg">
          <Dialog.Title className="text-lg font-semibold">Mesclar tag</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted-foreground">
            Todos os <strong>{source.count}</strong> artigo(s) com &quot;{source.name}&quot; serão
            movidos para a tag de destino.
          </Dialog.Description>
          <div className="mt-4 space-y-2">
            <Label htmlFor="tag-merge-target">Destino</Label>
            <select
              id="tag-merge-target"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Selecione...</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.count})
                </option>
              ))}
            </select>
            {error && <p className="text-xs text-danger" role="alert">{error}</p>}
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={submitting || !targetId}>
              {submitting ? 'Mesclando...' : 'Mesclar'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
