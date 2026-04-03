'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArticleForm } from '@/components/blog-admin/ArticleForm'
import type { BlogArticle } from '@/types/blog'

export default function BlogNewArticlePage() {
  const params = useParams()
  const router = useRouter()
  const locale = (params?.locale as string) ?? 'pt-BR'

  function handleSuccess(article: BlogArticle) {
    router.push(`/${locale}/blog-manage/${article.id}/edit`)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Novo Artigo</h1>
        <p className="text-sm text-muted-foreground">Crie um novo artigo para o blog</p>
      </div>
      <ArticleForm mode="create" onSuccess={handleSuccess} />
    </div>
  )
}
