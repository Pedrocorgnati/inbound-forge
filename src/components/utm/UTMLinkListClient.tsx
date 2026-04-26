'use client'

import { useCallback, useEffect, useState } from 'react'
import { Copy, Link2, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { toast } from '@/components/ui/toast'
// TASK-17 ST002 (CL-263): dialog de edicao de UTM.
import { UtmEditDialog } from '@/components/utm/UtmEditDialog'

interface UTMLinkItem {
  id: string
  postId: string
  source: string
  medium: string
  campaign: string
  content: string
  fullUrl: string
  createdAt: string
  post: {
    id: string
    channel: string
    caption: string | null
  }
}

interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

const TRUNCATE_LENGTH = 60

function truncateUrl(url: string): string {
  if (url.length <= TRUNCATE_LENGTH) return url
  return `${url.slice(0, TRUNCATE_LENGTH)}...`
}

export function UTMLinkListClient() {
  const [links, setLinks] = useState<UTMLinkItem[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeletePostId, setConfirmDeletePostId] = useState<string | null>(null)

  const fetchLinks = useCallback(async (p: number) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/v1/utm-links?page=${p}&limit=20`)
      if (!res.ok) throw new Error('Erro ao carregar UTM links')
      const json = await res.json()
      setLinks(json.data ?? [])
      setMeta(json.meta ?? null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar UTM links')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLinks(page)
  }, [page, fetchLinks])

  async function handleCopy(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copiado!')
    } catch {
      toast.error('Erro ao copiar link')
    }
  }

  async function handleDelete(postId: string) {
    setDeletingId(postId)
    try {
      const res = await fetch(`/api/v1/utm-links/${postId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'Erro ao remover UTM link')
      }
      toast.success('UTM link removido')
      await fetchLinks(page)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover UTM link')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div data-testid="utm-page" className="space-y-6">
      <div data-testid="utm-header">
        <h1 className="text-2xl font-bold text-foreground">UTM Links</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerenciamento de links UTM para rastreamento de conversões
        </p>
      </div>

      {isLoading && (
        <div className="space-y-3" data-testid="utm-loading">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} role="status" aria-label="Carregando...">
              <div className="rounded-lg border border-border p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <Skeleton variant="rectangle" className="h-5 w-24" />
                  <Skeleton variant="text" className="w-3/4" />
                </div>
                <Skeleton variant="text" className="w-1/2" />
              </div>
              <span className="sr-only">Carregando conteudo...</span>
            </div>
          ))}
        </div>
      )}

      {!isLoading && links.length === 0 && (
        <EmptyState
          icon={<Link2 className="h-12 w-12" />}
          title="Nenhum UTM link criado"
          description="Gere UTM links a partir dos seus posts para rastrear conversões"
        />
      )}

      {!isLoading && links.length > 0 && (
        <div className="space-y-3" data-testid="utm-list">
          {links.map((link) => (
            <div
              key={link.id}
              className="flex flex-col gap-2 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
              data-testid={`utm-item-${link.id}`}
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-medium text-primary"
                    data-testid="utm-item-channel"
                  >
                    {link.medium}
                  </span>
                  {link.post.caption && (
                    <span
                      className="truncate text-sm font-medium text-foreground"
                      title={link.post.caption} // G08: RESOLVED
                      data-testid="utm-item-caption"
                    >
                      {link.post.caption.length > 80
                        ? `${link.post.caption.slice(0, 80)}...`
                        : link.post.caption}
                    </span>
                  )}
                </div>
                <p
                  className="truncate text-xs text-muted-foreground"
                  title={link.fullUrl}
                  data-testid="utm-item-url"
                >
                  {truncateUrl(link.fullUrl)}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(link.fullUrl)}
                  aria-label={`Copiar link UTM do post ${link.post.caption ?? link.postId}`}
                  data-testid="utm-item-copy"
                >
                  <Copy className="h-4 w-4" aria-hidden />
                </Button>
                <UtmEditDialog
                  utmId={link.id}
                  postId={link.postId}
                  initial={{
                    source: link.source,
                    medium: link.medium,
                    campaign: link.campaign,
                    content: link.content ?? '',
                    term: '',
                  }}
                >
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={`Editar UTM do post ${link.post.caption ?? link.postId}`}
                    data-testid="utm-item-edit"
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </Button>
                </UtmEditDialog>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => setConfirmDeletePostId(link.postId)}
                  disabled={deletingId === link.postId}
                  isLoading={deletingId === link.postId}
                  aria-label={`Remover link UTM do post ${link.post.caption ?? link.postId}`}
                  data-testid="utm-item-delete"
                >
                  {deletingId !== link.postId && <Trash2 className="h-4 w-4" aria-hidden />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div
          className="flex items-center justify-center gap-2 pt-4"
          data-testid="utm-pagination"
        >
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            aria-label="Página anterior"
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} de {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
            aria-label="Proxima pagina"
          >
            Proximo
          </Button>
        </div>
      )}

      {/* Confirmação de exclusão de UTM link */}
      <ConfirmDialog
        open={confirmDeletePostId !== null}
        onClose={() => setConfirmDeletePostId(null)}
        onConfirm={async () => {
          if (confirmDeletePostId) {
            await handleDelete(confirmDeletePostId)
            setConfirmDeletePostId(null)
          }
        }}
        title="Remover UTM Link"
        message="Tem certeza que deseja remover este UTM link? O histórico de cliques será perdido. Esta ação não pode ser desfeita."
        confirmText="Remover"
        variant="danger"
      />
    </div>
  )
}
