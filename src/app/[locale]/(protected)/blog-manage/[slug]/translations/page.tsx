/**
 * Intake Review TASK-13 ST003 (CL-165..168) — pagina do workflow de traducoes.
 */
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { TranslationWorkflow } from '@/components/blog/TranslationWorkflow'

export const metadata: Metadata = { title: 'Traducoes do artigo' }

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export default async function TranslationsPage({ params }: PageProps) {
  const { slug } = await params

  const article = await prisma.blogArticle.findUnique({
    where: { slug },
    select: { id: true, slug: true, title: true },
  })

  if (!article) notFound()

  const translations = await prisma.blogArticleTranslation.findMany({
    where: { articleId: article.id },
    select: { id: true, locale: true, title: true, slug: true, status: true, updatedAt: true },
  })

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold">{article.title}</h1>
        <p className="text-sm text-muted-foreground">Slug: {article.slug}</p>
      </header>

      <TranslationWorkflow
        slug={article.slug}
        initialTranslations={translations.map((t) => ({
          id: t.id,
          locale: t.locale,
          title: t.title,
          slug: t.slug,
          status: t.status as 'DRAFT' | 'APPROVED' | 'REJECTED',
          updatedAt: t.updatedAt.toISOString(),
        }))}
      />
    </div>
  )
}
