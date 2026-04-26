'use client'

import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArticleForm } from '@/components/blog-admin/ArticleForm'
import type { BlogArticle } from '@/types/blog'

export default function BlogNewArticlePage() {
  const params = useParams()
  const router = useRouter()
  const locale = (params?.locale as string) ?? 'pt-BR'
  const t = useTranslations('blog.newPage')

  function handleSuccess(article: BlogArticle) {
    router.push(`/${locale}/blog-manage/${article.id}/edit`)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </div>
      <ArticleForm mode="create" onSuccess={handleSuccess} />
    </div>
  )
}
