// Pagina /blog-manage/[slug]/preview — preview SEO + render (TASK-9 ST003 / CL-237)

import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ArticlePreview } from '@/components/blog-admin/ArticlePreview'

interface Props {
  params: Promise<{ locale: string; slug: string }>
}

export default async function BlogPreviewPage({ params }: Props) {
  const { locale, slug } = await params
  const article = await prisma.blogArticle.findFirst({
    where: { slug },
    select: { id: true, slug: true },
  })
  if (!article) notFound()

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col" data-testid="blog-preview-page">
      <ArticlePreview articleId={article.id} locale={locale} slug={article.slug} />
    </div>
  )
}
