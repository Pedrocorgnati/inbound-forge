'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { VersionHistory } from '@/components/blog-admin/VersionHistory'
import type { BlogArticle } from '@/types/blog'

export default function BlogVersionsPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string
  const locale = (params?.locale as string) ?? 'pt-BR'

  const [article, setArticle] = React.useState<BlogArticle | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

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

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  if (!article) return null

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href={`/${locale}/blog`} className="hover:text-foreground transition-colors">
          Blog
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <Link href={`/${locale}/blog/${id}/edit`} className="hover:text-foreground transition-colors">
          Artigo
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <span className="text-foreground font-medium">Versoes</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Historico de Versoes
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="primary">Versao atual: v{article.currentVersion}</Badge>
          </div>
        </div>
        <Link href={`/${locale}/blog/${id}/edit`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
            Voltar para edicao
          </Button>
        </Link>
      </div>

      {/* Version History */}
      <VersionHistory
        articleId={id}
        currentTitle={article.title}
        currentBody={article.body}
      />
    </div>
  )
}
