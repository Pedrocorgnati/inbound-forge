import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, internalError, validationError } from '@/lib/api-auth'
import { BLOG_STATUS, CONTENT_STATUS, THEME_STATUS } from '@/constants/status'

const ApprovalTypeSchema = z.enum(['all', 'theme', 'content', 'post', 'blog'])
const PrioritySchema = z.enum(['all', 'critical', 'high', 'medium', 'low'])
const AgeSchema = z.enum(['all', '24h', '7d', '30d'])

const QuerySchema = z.object({
  type: ApprovalTypeSchema.default('all'),
  priority: PrioritySchema.default('all'),
  age: AgeSchema.default('all'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

type ApprovalType = z.infer<typeof ApprovalTypeSchema>
type ApprovalPriority = Exclude<z.infer<typeof PrioritySchema>, 'all'>

type ApprovalItem = {
  type: Exclude<ApprovalType, 'all'>
  id: string
  title: string
  priority: ApprovalPriority
  priority_score: number
  created_at: string
  detail_href: string
  approve: {
    method: 'PATCH' | 'POST'
    endpoint: string
    body?: Record<string, unknown>
  }
  meta: {
    source: string
    description: string
    channel?: string
  }
}

function getAgeStart(age: z.infer<typeof AgeSchema>): Date | null {
  if (age === '24h') return new Date(Date.now() - 24 * 60 * 60 * 1000)
  if (age === '7d') return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  if (age === '30d') return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  return null
}

function normalizePriority(score: number, createdAt: Date): ApprovalPriority {
  const ageHours = (Date.now() - createdAt.getTime()) / (60 * 60 * 1000)
  if (score >= 85 || ageHours >= 72) return 'critical'
  if (score >= 70 || ageHours >= 48) return 'high'
  if (score >= 40 || ageHours >= 24) return 'medium'
  return 'low'
}

function toIso(date: Date) {
  return date.toISOString()
}

function matchesPriority(item: ApprovalItem, priority: z.infer<typeof PrioritySchema>) {
  return priority === 'all' || item.priority === priority
}

export async function GET(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  const { searchParams } = new URL(request.url)
  const parsed = QuerySchema.safeParse({
    type: searchParams.get('type') ?? undefined,
    priority: searchParams.get('priority') ?? undefined,
    age: searchParams.get('age') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  })
  if (!parsed.success) return validationError(parsed.error)

  const { type, priority, age, limit } = parsed.data
  const createdAt = getAgeStart(age)
  const dateFilter = createdAt ? { gte: createdAt } : undefined

  try {
    const [themes, contentPieces, posts, articles] = await Promise.all([
      type === 'all' || type === 'theme'
        ? prisma.theme.findMany({
            where: {
              status: THEME_STATUS.ACTIVE,
              isNew: true,
              archivedAt: null,
              ...(dateFilter ? { createdAt: dateFilter } : {}),
            },
            orderBy: [{ priorityScore: 'desc' }, { createdAt: 'asc' }],
            take: limit,
            select: {
              id: true,
              title: true,
              priorityScore: true,
              opportunityScore: true,
              createdAt: true,
            },
          })
        : Promise.resolve([]),
      type === 'all' || type === 'content'
        ? prisma.contentPiece.findMany({
            where: {
              status: { in: [CONTENT_STATUS.DRAFT, CONTENT_STATUS.REVIEW] },
              ...(dateFilter ? { createdAt: dateFilter } : {}),
            },
            orderBy: { createdAt: 'asc' },
            take: limit,
            select: {
              id: true,
              themeId: true,
              baseTitle: true,
              painCategory: true,
              recommendedChannel: true,
              selectedAngle: true,
              createdAt: true,
              angles: {
                select: { angle: true, isSelected: true },
                orderBy: { createdAt: 'asc' },
              },
            },
          })
        : Promise.resolve([]),
      type === 'all' || type === 'post'
        ? prisma.post.findMany({
            where: {
              approvedAt: null,
              status: { in: [CONTENT_STATUS.DRAFT, CONTENT_STATUS.REVIEW, CONTENT_STATUS.PENDING_ART] },
              ...(dateFilter ? { createdAt: dateFilter } : {}),
            },
            orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }],
            take: limit,
            select: {
              id: true,
              channel: true,
              caption: true,
              status: true,
              scheduledAt: true,
              createdAt: true,
              contentPiece: { select: { id: true, themeId: true, baseTitle: true } },
            },
          })
        : Promise.resolve([]),
      type === 'all' || type === 'blog'
        ? prisma.blogArticle.findMany({
            where: {
              status: BLOG_STATUS.REVIEW,
              approvedAt: null,
              ...(dateFilter ? { createdAt: dateFilter } : {}),
            },
            orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'asc' }],
            take: limit,
            select: {
              id: true,
              slug: true,
              title: true,
              scheduledFor: true,
              createdAt: true,
            },
          })
        : Promise.resolve([]),
    ])

    const items: ApprovalItem[] = [
      ...themes.map((theme) => {
        const score = theme.priorityScore || Math.round(theme.opportunityScore)
        return {
          type: 'theme' as const,
          id: theme.id,
          title: theme.title,
          priority: normalizePriority(score, theme.createdAt),
          priority_score: score,
          created_at: toIso(theme.createdAt),
          detail_href: `/themes/${theme.id}`,
          approve: {
            method: 'PATCH' as const,
            endpoint: `/api/v1/themes/${theme.id}`,
            body: { isNew: false },
          },
          meta: {
            source: 'themes',
            description: 'Tema novo aguardando aprovação editorial.',
          },
        }
      }),
      ...contentPieces.map((piece) => {
        const selectedAngle =
          piece.selectedAngle ?? piece.angles.find((angle) => angle.isSelected)?.angle ?? piece.angles[0]?.angle
        return {
          type: 'content' as const,
          id: piece.id,
          title: piece.baseTitle,
          priority: normalizePriority(piece.recommendedChannel === 'BLOG' ? 72 : 58, piece.createdAt),
          priority_score: piece.recommendedChannel === 'BLOG' ? 72 : 58,
          created_at: toIso(piece.createdAt),
          detail_href: `/content/${piece.themeId}`,
          approve: {
            method: 'POST' as const,
            endpoint: `/api/v1/content/${piece.id}/approve`,
            body: { angleId: selectedAngle },
          },
          meta: {
            source: 'content_pieces',
            description: piece.painCategory,
            channel: piece.recommendedChannel,
          },
        }
      }),
      ...posts.map((post) => {
        const title = post.contentPiece?.baseTitle ?? post.caption.slice(0, 90)
        const scheduledScore = post.scheduledAt ? 84 : 65
        return {
          type: 'post' as const,
          id: post.id,
          title,
          priority: normalizePriority(scheduledScore, post.createdAt),
          priority_score: scheduledScore,
          created_at: toIso(post.createdAt),
          detail_href: post.contentPiece?.themeId
            ? `/content/${post.contentPiece.themeId}`
            : `/posts/${post.id}/publish-assist`,
          approve: {
            method: 'POST' as const,
            endpoint: `/api/v1/posts/${post.id}/approve`,
          },
          meta: {
            source: 'posts',
            description: post.scheduledAt
              ? `Agendado para ${post.scheduledAt.toISOString()}`
              : `Status ${post.status}`,
            channel: post.channel,
          },
        }
      }),
      ...articles.map((article) => ({
        type: 'blog' as const,
        id: article.id,
        title: article.title,
        priority: normalizePriority(article.scheduledFor ? 88 : 70, article.createdAt),
        priority_score: article.scheduledFor ? 88 : 70,
        created_at: toIso(article.createdAt),
        detail_href: `/blog-manage/${article.slug}/review`,
        approve: {
          method: 'POST' as const,
          endpoint: `/api/blog-articles/${article.id}/approve`,
          body: { approvedBy: 'Approvals inbox' },
        },
        meta: {
          source: 'blog_articles',
          description: article.scheduledFor
            ? `Programado para ${article.scheduledFor.toISOString()}`
            : 'Artigo em revisão.',
          channel: 'BLOG',
        },
      })),
    ]
      .filter((item) => matchesPriority(item, priority))
      .sort((a, b) => {
        const priorityWeight: Record<ApprovalPriority, number> = {
          critical: 4,
          high: 3,
          medium: 2,
          low: 1,
        }
        const byPriority = priorityWeight[b.priority] - priorityWeight[a.priority]
        if (byPriority !== 0) return byPriority
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      })
      .slice(0, limit)

    return ok({
      items,
      totals: {
        all: items.length,
        theme: items.filter((item) => item.type === 'theme').length,
        content: items.filter((item) => item.type === 'content').length,
        post: items.filter((item) => item.type === 'post').length,
        blog: items.filter((item) => item.type === 'blog').length,
      },
    })
  } catch (err) {
    console.error('[GET /api/v1/approvals]', err)
    return internalError('Falha ao carregar aprovações.')
  }
}
