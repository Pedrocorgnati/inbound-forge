'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Plus, Pencil, Send, Trash2, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { Pagination } from '@/components/ui/pagination'
import type { BlogArticle, PaginatedArticles } from '@/types/blog'

const STATUS_BADGE_MAP: Record<string, { label: string; variant: 'warning' | 'info' | 'success' | 'default' }> = {
  DRAFT: { label: 'Rascunho', variant: 'warning' },
  REVIEW: { label: 'Em Revisao', variant: 'info' },
  PUBLISHED: { label: 'Publicado', variant: 'success' },
  ARCHIVED: { label: 'Arquivado', variant: 'default' },
}

const PAGE_SIZE = 10

export default function BlogAdminListPage() {
  const params = useParams()
  const _router = useRouter()
  const locale = (params?.locale as string) ?? 'pt-BR'

  const [data, setData] = React.useState<PaginatedArticles | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL')
  const [page, setPage] = React.useState(1)

  // Delete state
  const [deleteTarget, setDeleteTarget] = React.useState<BlogArticle | null>(null)
  const [_isDeleting, setIsDeleting] = React.useState(false)

  // Publish state
  const [publishTarget, setPublishTarget] = React.useState<BlogArticle | null>(null)
  const [_isPublishing, setIsPublishing] = React.useState(false)

  const fetchArticles = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
      if (statusFilter !== 'ALL') params.set('status', statusFilter)

      const res = await fetch(`/api/blog-articles?${params}`)
      if (!res.ok) throw new Error('Erro ao carregar artigos')
      const result: PaginatedArticles = await res.json()
      setData(result)
    } catch {
      toast.error('Falha ao carregar artigos')
    } finally {
      setIsLoading(false)
    }
  }, [page, statusFilter])

  React.useEffect(() => {
    fetchArticles()
  }, [fetchArticles])

  function handleTabChange(value: string) {
    setStatusFilter(value)
    setPage(1)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/blog-articles/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? 'Erro ao deletar')
      }
      toast.success('Artigo deletado com sucesso')
      setDeleteTarget(null)
      fetchArticles()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao deletar artigo')
    } finally {
      setIsDeleting(false)
    }
  }

  async function handlePublish() {
    if (!publishTarget) return
    setIsPublishing(true)
    try {
      const res = await fetch(`/api/blog-articles/${publishTarget.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        // BLOG_050: cannot publish without approval
        throw new Error(err.message ?? 'Erro ao publicar')
      }
      toast.success('Artigo publicado com sucesso!')
      setPublishTarget(null)
      fetchArticles()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao publicar artigo')
    } finally {
      setIsPublishing(false)
    }
  }

  function formatDate(date: Date | string) {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Blog</h1>
          <p className="text-sm text-muted-foreground">Gerencie os artigos do blog</p>
        </div>
        <Link href={`/${locale}/blog-manage/new`}>
          <Button>
            <Plus className="mr-1 h-4 w-4" aria-hidden />
            Novo Artigo
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="ALL" onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="ALL">Todos</TabsTrigger>
          <TabsTrigger value="DRAFT">Rascunhos</TabsTrigger>
          <TabsTrigger value="REVIEW">Em Revisao</TabsTrigger>
          <TabsTrigger value="PUBLISHED">Publicados</TabsTrigger>
        </TabsList>

        {['ALL', 'DRAFT', 'REVIEW', 'PUBLISHED'].map((tab) => (
          <TabsContent key={tab} value={tab}>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !data || data.items.length === 0 ? (
              <div className="rounded-lg border border-border p-8 text-center">
                <p className="text-muted-foreground">Nenhum artigo encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-3 pr-4 text-left font-medium text-muted-foreground">Titulo</th>
                      <th className="py-3 pr-4 text-left font-medium text-muted-foreground">Status</th>
                      <th className="hidden py-3 pr-4 text-left font-medium text-muted-foreground sm:table-cell">Data</th>
                      <th className="py-3 text-right font-medium text-muted-foreground">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((article) => {
                      const statusInfo = STATUS_BADGE_MAP[article.status] ?? STATUS_BADGE_MAP.DRAFT
                      const isApproved = Boolean(article.approvedAt)

                      return (
                        <tr key={article.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                          <td className="py-3 pr-4">
                            <p className="font-medium">{article.title}</p>
                            <p className="text-xs text-muted-foreground">/{article.slug}</p>
                          </td>
                          <td className="py-3 pr-4">
                            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                          </td>
                          <td className="hidden py-3 pr-4 text-muted-foreground sm:table-cell">
                            {formatDate(article.updatedAt)}
                          </td>
                          <td className="py-3">
                            <div className="flex items-center justify-end gap-1">
                              <Link href={`/${locale}/blog-manage/${article.id}/edit`}>
                                <Button variant="ghost" size="sm" aria-label="Editar artigo">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </Link>

                              {article.status === 'REVIEW' && (
                                <Link href={`/${locale}/blog-manage/${article.id}/review`}>
                                  <Button variant="ghost" size="sm" aria-label="Revisar artigo">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                              )}

                              {isApproved && article.status !== 'PUBLISHED' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setPublishTarget(article)}
                                  aria-label="Publicar artigo"
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              )}

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteTarget(article)}
                                aria-label="Deletar artigo"
                                className="text-danger hover:text-danger"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {data && data.totalPages > 1 && (
        <Pagination
          total={data.total}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}

      {/* Delete confirmation modal */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Deletar Artigo"
        description={`Tem certeza que deseja deletar "${deleteTarget?.title}"? Esta acao nao pode ser desfeita.`}
        onConfirm={handleDelete}
        confirmLabel="Sim, deletar"
        cancelLabel="Cancelar"
        isDestructive
      />

      {/* Publish confirmation modal */}
      <Modal
        open={Boolean(publishTarget)}
        onClose={() => setPublishTarget(null)}
        title="Publicar Artigo"
        description={`Deseja publicar "${publishTarget?.title}"? O artigo ficara disponivel publicamente.`}
        onConfirm={handlePublish}
        confirmLabel="Publicar"
        cancelLabel="Cancelar"
      />
    </div>
  )
}
