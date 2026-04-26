'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ArticleForm } from '@/components/blog-admin/ArticleForm'
import type { BlogArticle } from '@/types/blog'

export default function BlogEditArticlePage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.slug as string
  const locale = (params?.locale as string) ?? 'pt-BR'
  const t = useTranslations('blog.editPage')

  const [article, setArticle] = React.useState<BlogArticle | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/blog-articles/${id}`)
        if (!res.ok) throw new Error('Artigo não encontrado')
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

  function handleSuccess(updated: BlogArticle) {
    setArticle(updated)
    toast.success('Artigo atualizado com sucesso!')
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!article) return null

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{t('version')} {article.currentVersion}</span>
            <Badge variant="default">{article.status}</Badge>
          </div>
        </div>
        <Link href={`/${locale}/blog-manage/${id}/review`}>
          <Button variant="outline" size="sm">
            <History className="mr-1 h-4 w-4" aria-hidden />
            {t('viewHistory')}
          </Button>
        </Link>
      </div>

      <ArticleForm mode="edit" article={article} onSuccess={handleSuccess} />
    </div>
  )
}
