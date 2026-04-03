'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import { toast } from 'sonner'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ApprovalGate } from '@/components/blog-admin/ApprovalGate'
import type { BlogArticle } from '@/types/blog'

export default function BlogReviewPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.slug as string
  const locale = (params?.locale as string) ?? 'pt-BR'

  const [article, setArticle] = React.useState<BlogArticle | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isApproving, setIsApproving] = React.useState(false)
  const [isPublishing, setIsPublishing] = React.useState(false)

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/blog-articles/${id}`)
        if (!res.ok) throw new Error('Artigo nao encontrado')
        const data: BlogArticle = await res.json()
        setArticle(data)
      } catch {
        toast.error('Erro ao carregar artigo')
        router.push(`/${locale}/blog`)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id, locale, router])

  async function handleApprove() {
    if (!article) return
    setIsApproving(true)
    try {
      const res = await fetch(`/api/blog-articles/${article.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy: 'Admin' }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? 'Erro ao aprovar')
      }
      const updated: BlogArticle = await res.json()
      setArticle(updated)
      toast.success('Artigo aprovado com sucesso!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao aprovar artigo')
    } finally {
      setIsApproving(false)
    }
  }

  async function handlePublish() {
    if (!article) return
    setIsPublishing(true)
    try {
      const res = await fetch(`/api/blog-articles/${article.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? 'Erro ao publicar')
      }
      toast.success('Artigo publicado com sucesso!')
      router.push(`/${locale}/blog`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao publicar artigo')
    } finally {
      setIsPublishing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (!article) return null

  const isApproved = Boolean(article.approvedAt)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Revisao: {article.title}</h1>
        <p className="text-sm text-muted-foreground">
          Versao {article.currentVersion} | Autor: {article.authorName}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Article preview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Preview do Artigo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                {article.body}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>

        {/* Right: Approval gate or Publish */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Aprovacao</CardTitle>
            </CardHeader>
            <CardContent>
              {isApproved ? (
                <div className="space-y-4">
                  <p className="text-sm text-green-700 font-medium">
                    Artigo aprovado por {article.approvedBy ?? 'Admin'} em{' '}
                    {article.approvedAt
                      ? new Date(article.approvedAt).toLocaleDateString('pt-BR')
                      : ''}
                  </p>

                  {article.status !== 'PUBLISHED' && (
                    <Button
                      onClick={handlePublish}
                      disabled={isPublishing}
                      isLoading={isPublishing}
                      loadingText="Publicando..."
                      className="w-full"
                    >
                      <Send className="mr-1 h-4 w-4" aria-hidden />
                      Publicar Artigo
                    </Button>
                  )}

                  {article.status === 'PUBLISHED' && (
                    <p className="text-sm text-muted-foreground">
                      Artigo ja publicado em{' '}
                      {article.publishedAt
                        ? new Date(article.publishedAt).toLocaleDateString('pt-BR')
                        : ''}
                    </p>
                  )}
                </div>
              ) : (
                <ApprovalGate
                  article={article}
                  onApprove={handleApprove}
                  isApproving={isApproving}
                />
              )}
            </CardContent>
          </Card>

          {/* SEO summary */}
          <Card>
            <CardHeader>
              <CardTitle>SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Meta Titulo:</span>{' '}
                <span className="text-muted-foreground">{article.metaTitle || 'Nao definido'}</span>
              </div>
              <div>
                <span className="font-medium">Meta Descricao:</span>{' '}
                <span className="text-muted-foreground">
                  {article.metaDescription || 'Nao definida'}
                  {article.metaDescription && ` (${article.metaDescription.length} chars)`}
                </span>
              </div>
              <div>
                <span className="font-medium">Tags:</span>{' '}
                <span className="text-muted-foreground">
                  {article.tags.length > 0 ? article.tags.join(', ') : 'Nenhuma'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
