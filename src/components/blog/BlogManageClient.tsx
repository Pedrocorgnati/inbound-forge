'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus, Pencil, Send, Trash2, Eye, Download } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { Pagination } from '@/components/ui/pagination'
import type { BlogArticle, PaginatedArticles } from '@/types/blog'
import { BLOG_STATUS, BLOG_STATUS_TABS } from '@/constants/status'
import { useFormatters } from '@/lib/i18n/formatters'

const PAGE_SIZE = 10

interface BlogManageClientProps {
  locale: string
}

export function BlogManageClient({ locale }: BlogManageClientProps) {
  const _router = useRouter()
  const fmt = useFormatters()
  const t = useTranslations('blog.manage')
  const tCommon = useTranslations('common')
  const tBlogStatus = useTranslations('blog.status')

  const STATUS_BADGE_MAP: Record<string, { label: string; variant: 'warning' | 'info' | 'success' | 'default' }> = {
    DRAFT: { label: tBlogStatus('DRAFT'), variant: 'warning' },
    REVIEW: { label: tBlogStatus('REVIEW'), variant: 'info' },
    PUBLISHED: { label: tBlogStatus('PUBLISHED'), variant: 'success' },
    ARCHIVED: { label: tBlogStatus('ARCHIVED'), variant: 'default' },
  }

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
      const searchParams = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
      if (statusFilter !== 'ALL') searchParams.set('status', statusFilter)

      const res = await fetch(`/api/blog-articles?${searchParams}`)
      if (!res.ok) throw new Error('Erro ao carregar artigos')
      const json = await res.json()
      // okPaginated retorna { success, data: T[], pagination: { total, totalPages, ... } }
      const result: PaginatedArticles = {
        items: json.data ?? [],
        total: json.pagination?.total ?? 0,
        totalPages: json.pagination?.totalPages ?? 0,
        page: json.pagination?.page ?? page,
        limit: json.pagination?.limit ?? PAGE_SIZE,
      }
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
    return fmt.date(date, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return (
    <div data-testid="blog-manage-page" className="space-y-6">
      <div data-testid="blog-manage-header" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('description')}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* TASK-8 CL-118: Export MDX */}
          <a
            href={`/api/v1/blog/export?format=mdx`}
            download
            data-testid="blog-manage-export-mdx"
          >
            <Button variant="outline" size="sm">
              <Download className="mr-1 h-4 w-4" aria-hidden />
              Exportar MDX
            </Button>
          </a>
          <Link href={`/${locale}/blog-manage/new`} data-testid="blog-manage-new-article-button">
            <Button>
              <Plus className="mr-1 h-4 w-4" aria-hidden />
              {t('new')}
            </Button>
          </Link>
        </div>
      </div>

      <Tabs data-testid="blog-manage-tabs" defaultValue="ALL" onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="ALL">{t('filterAll')}</TabsTrigger>
          <TabsTrigger value="DRAFT">{t('filterDraft')}</TabsTrigger>
          <TabsTrigger value="REVIEW">{t('filterReview')}</TabsTrigger>
          <TabsTrigger value="PUBLISHED">{t('filterPublished')}</TabsTrigger>
        </TabsList>

        {BLOG_STATUS_TABS.map((tab) => (
          <TabsContent key={tab} value={tab}>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !data || data.items.length === 0 ? (
              <div className="rounded-lg border border-border p-8 text-center">
                <p className="text-muted-foreground">{t('empty')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table data-testid="blog-manage-table" className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-3 pr-4 text-left font-medium text-muted-foreground">{t('colTitle')}</th>
                      <th className="py-3 pr-4 text-left font-medium text-muted-foreground">{t('colStatus')}</th>
                      <th className="hidden py-3 pr-4 text-left font-medium text-muted-foreground sm:table-cell">{t('colDate')}</th>
                      <th className="py-3 text-right font-medium text-muted-foreground">{t('colActions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((article) => {
                      const statusInfo = STATUS_BADGE_MAP[article.status] ?? STATUS_BADGE_MAP.DRAFT
                      const isApproved = Boolean(article.approvedAt)

                      return (
                        <tr data-testid={`blog-manage-article-row-${article.id}`} key={article.id} className="border-b border-border last:border-0 hover:bg-muted/50">
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
                                <Button data-testid={`blog-manage-article-edit-button-${article.id}`} variant="ghost" size="sm" aria-label={tCommon('edit')}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </Link>

                              {article.status === BLOG_STATUS.REVIEW && (
                                <Link href={`/${locale}/blog-manage/${article.id}/review`}>
                                  <Button data-testid={`blog-manage-article-review-button-${article.id}`} variant="ghost" size="sm" aria-label="Revisar artigo">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                              )}

                              {isApproved && article.status !== BLOG_STATUS.PUBLISHED && (
                                <Button
                                  data-testid={`blog-manage-article-publish-button-${article.id}`}
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setPublishTarget(article)}
                                  aria-label={t('publishLabel')}
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              )}

                              <Button
                                data-testid={`blog-manage-article-delete-button-${article.id}`}
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteTarget(article)}
                                aria-label={tCommon('delete')}
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
        data-testid="blog-manage-delete-modal"
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={t('deleteTitle')}
        description={`Tem certeza que deseja deletar "${deleteTarget?.title}"? Esta ação não pode ser desfeita.`}
        onConfirm={handleDelete}
        confirmLabel={t('deleteConfirm')}
        cancelLabel={tCommon('cancel')}
        isDestructive
      />

      {/* Publish confirmation modal */}
      <Modal
        data-testid="blog-manage-publish-modal"
        open={Boolean(publishTarget)}
        onClose={() => setPublishTarget(null)}
        title={t('publishLabel')}
        description={`Deseja publicar "${publishTarget?.title}"? O artigo ficará disponível publicamente.`}
        onConfirm={handlePublish}
        confirmLabel={t('publishButton')}
        cancelLabel={tCommon('cancel')}
      />
    </div>
  )
}
