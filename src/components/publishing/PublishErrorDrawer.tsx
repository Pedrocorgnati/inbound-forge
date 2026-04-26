'use client'

/**
 * TASK-5/ST003 — Drawer de historico de falhas de publicacao (CL-198).
 */
import * as React from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface PublishError {
  id: string
  channel: string
  statusCode: number | null
  apiMessage: string | null
  requestPayload: unknown
  responseBody: unknown
  createdAt: string
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function statusVariant(code: number | null): 'error' | 'default' | 'warning' {
  if (!code) return 'default'
  if (code >= 500) return 'error'
  if (code >= 400) return 'warning'
  return 'default'
}

export function PublishErrorDrawer({
  postId,
  open,
  onClose,
}: {
  postId: string
  open: boolean
  onClose: () => void
}) {
  const { data, isLoading } = useSWR<{ data: PublishError[] }>(
    open ? `/api/v1/posts/${postId}/errors` : null,
    fetcher
  )
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set())

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  async function copyError(err: PublishError) {
    try {
      await navigator.clipboard.writeText(JSON.stringify(err, null, 2))
      toast.success('Erro copiado')
    } catch {
      toast.error('Falha ao copiar')
    }
  }

  const errors = data?.data ?? []

  return (
    <Modal open={open} onClose={onClose} title="Historico de falhas" size="lg">
      <div className="max-h-[60vh] overflow-y-auto space-y-3" data-testid="publish-error-drawer">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {!isLoading && errors.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma falha registrada.</p>
        )}
        {errors.map((err) => {
          const isOpen = expanded.has(err.id)
          return (
            <div key={err.id} className="rounded border border-border p-3">
              <button
                type="button"
                onClick={() => toggle(err.id)}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <Badge variant={statusVariant(err.statusCode)}>
                    {err.statusCode ?? 'N/A'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(err.createdAt).toLocaleString()}
                  </span>
                  <span className="text-xs uppercase text-muted-foreground">{err.channel}</span>
                </div>
                <span className="text-xs text-muted-foreground">{isOpen ? '-' : '+'}</span>
              </button>
              <p className="mt-2 text-sm">{err.apiMessage ?? 'Sem mensagem'}</p>
              {isOpen && (
                <div className="mt-3 space-y-2">
                  {err.requestPayload !== null && err.requestPayload !== undefined && (
                    <div>
                      <p className="text-xs font-medium">Request</p>
                      <pre className="max-h-48 overflow-auto rounded bg-muted p-2 text-xs">
                        {JSON.stringify(err.requestPayload, null, 2)}
                      </pre>
                    </div>
                  )}
                  {err.responseBody !== null && err.responseBody !== undefined && (
                    <div>
                      <p className="text-xs font-medium">Response</p>
                      <pre className="max-h-48 overflow-auto rounded bg-muted p-2 text-xs">
                        {JSON.stringify(err.responseBody, null, 2)}
                      </pre>
                    </div>
                  )}
                  <Button size="sm" variant="outline" onClick={() => copyError(err)}>
                    Copiar erro
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
