// TASK-6 ST001 (CL-286): worker que promove BlogArticle SCHEDULED para PUBLISHED
// quando scheduledFor <= now(). Idempotente via filtro de status. Rate-limit
// em 50 por execucao para nao esgotar conexoes do DB.

import 'server-only'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auditLog } from '@/lib/audit'

const MAX_PER_RUN = 50

export interface SchedulerResult {
  processed: number
  published: string[]
  errors: Array<{ id: string; error: string }>
}

export async function processScheduledArticles(now: Date = new Date()): Promise<SchedulerResult> {
  const due = await prisma.blogArticle.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledFor: { lte: now },
    },
    select: { id: true, slug: true },
    take: MAX_PER_RUN,
    orderBy: { scheduledFor: 'asc' },
  })

  const result: SchedulerResult = { processed: due.length, published: [], errors: [] }

  for (const article of due) {
    try {
      await prisma.blogArticle.update({
        where: { id: article.id },
        data: { status: 'PUBLISHED', publishedAt: now },
      })
      try {
        revalidatePath('/blog')
        revalidatePath(`/blog/${article.slug}`)
      } catch {
        // revalidatePath may fail out of request context; ignore
      }
      await auditLog({
        action: 'publish_scheduled_article',
        entityType: 'BlogArticle',
        entityId: article.id,
        userId: 'system:blog-scheduler',
        metadata: { slug: article.slug, auto: true },
      }).catch(() => undefined)
      result.published.push(article.id)
    } catch (err) {
      result.errors.push({
        id: article.id,
        error: err instanceof Error ? err.message : 'unknown',
      })
    }
  }

  return result
}
