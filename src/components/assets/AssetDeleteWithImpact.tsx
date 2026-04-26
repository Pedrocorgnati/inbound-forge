'use client'

// Intake Review TASK-10 ST004 (CL-242) — dialog de delete com aviso de impacto.
// Busca usage do asset antes de confirmar.

import { useEffect, useState } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/api-client'

interface UsageItem {
  type: 'image_job' | 'content_piece'
  id: string
  label: string
  status?: string
}

interface AssetDeleteWithImpactProps {
  assetId: string
  trigger?: React.ReactNode
  onDeleted?: () => void
}

export function AssetDeleteWithImpact({ assetId, trigger, onDeleted }: AssetDeleteWithImpactProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [count, setCount] = useState<number | null>(null)
  const [items, setItems] = useState<UsageItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError(null)
    apiClient(`/api/v1/assets/${assetId}/usage`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        setCount(data?.count ?? 0)
        setItems(Array.isArray(data?.items) ? data.items : [])
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível carregar o uso do asset')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [assetId, open])

  const confirm = async () => {
    setDeleting(true)
    setError(null)
    try {
      const res = await apiClient(`/api/v1/assets/${assetId}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(body?.message ?? 'Falha ao deletar')
      }
      setOpen(false)
      onDeleted?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao deletar')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="text-danger hover:bg-danger/10">
            <Trash2 className="h-4 w-4" /> Deletar
          </Button>
        )}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[90%] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-lg">
          <Dialog.Title className="flex items-center gap-2 text-lg font-semibold">
            <AlertTriangle className="h-5 w-5 text-warning" aria-hidden />
            Deletar asset
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted-foreground">
            Antes de deletar, revise os conteúdos que usam este asset.
          </Dialog.Description>

          <div className="mt-4 min-h-[80px] text-sm">
            {loading && <p className="text-muted-foreground">Carregando uso...</p>}
            {!loading && count !== null && (
              <p className="font-medium">
                {count === 0
                  ? 'Nenhum uso encontrado — seguro para deletar.'
                  : `Usado em ${count} item(s):`}
              </p>
            )}
            {!loading && items.length > 0 && (
              <ul className="mt-2 max-h-48 space-y-1 overflow-auto rounded-md border border-border bg-card p-2">
                {items.map((i) => (
                  <li key={`${i.type}-${i.id}`} className="text-xs">
                    <span className="font-mono text-muted-foreground">[{i.type}]</span>{' '}
                    {i.label}
                    {i.status && (
                      <span className="ml-1 text-muted-foreground">— {i.status}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {error && <p className="mt-2 text-danger" role="alert">{error}</p>}
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button
              variant="outline"
              onClick={confirm}
              disabled={deleting || loading}
              className="text-danger hover:bg-danger/10"
            >
              {deleting ? 'Deletando...' : 'Deletar mesmo assim'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
