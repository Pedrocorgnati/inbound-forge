/**
 * PostService — module-12-calendar-publishing
 * CRUD de posts com validação de ownership e aprovação.
 * INT-065 | INT-066 | QUAL-005 | SEC-007
 */
import { prisma } from '@/lib/prisma'
import { Channel, ContentStatus } from '@/types/enums'
import type { CreatePostInput, UpdatePostInput } from '@/lib/validators/post'
import { adaptForChannel } from '@/lib/utils/channel-adapter'
import { buildSearchWhere } from '@/lib/search/text-search'

const POST_PAGE_LIMIT = 20

export interface PostListParams {
  channel?: string
  channels?: string[]
  status?: string
  statuses?: string[]
  page?: number
  scheduledFrom?: string
  scheduledTo?: string
  // Intake-Review TASK-22 ST002 (CL-PB-052): busca textual em caption.
  search?: string
}

export class PostService {
  /**
   * Lista posts do usuário com filtros e paginação.
   */
  static async list(params: PostListParams = {}) {
    const page = Math.max(1, params.page ?? 1)
    const skip = (page - 1) * POST_PAGE_LIMIT

    const channels = params.channels ?? (params.channel ? [params.channel] : undefined)
    const statuses = params.statuses ?? (params.status ? [params.status] : undefined)
    const where: Record<string, unknown> = {
      ...(channels?.length && { channel: { in: channels as Channel[] } }),
      ...(statuses?.length && { status: { in: statuses as ContentStatus[] } }),
      ...(params.scheduledFrom || params.scheduledTo
        ? {
            scheduledAt: {
              ...(params.scheduledFrom && { gte: new Date(params.scheduledFrom) }),
              ...(params.scheduledTo && { lte: new Date(params.scheduledTo) }),
            },
          }
        : {}),
    }

    const searchWhere = buildSearchWhere(params.search, ['caption'] as const)
    if (searchWhere) Object.assign(where, searchWhere)

    const [items, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: POST_PAGE_LIMIT,
        orderBy: { createdAt: 'desc' },
        include: { publishingQueue: true },
      }),
      prisma.post.count({ where }),
    ])

    return { items, total, page, limit: POST_PAGE_LIMIT }
  }

  /**
   * Busca post por ID. Retorna null se não encontrado.
   */
  static async findById(id: string) {
    return prisma.post.findUnique({
      where: { id },
      include: { publishingQueue: true, contentPiece: true },
    })
  }

  /**
   * Cria post manualmente ou a partir de ContentPiece (CX-03).
   */
  static async create(data: CreatePostInput) {
    return prisma.post.create({
      data: {
        channel: data.channel as Channel,
        caption: data.caption,
        hashtags: data.hashtags ?? [],
        ctaText: data.ctaText,
        ctaUrl: data.ctaUrl,
        imageUrl: data.imageUrl,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        contentPieceId: data.contentPieceId,
        status: ContentStatus.DRAFT,
        cta: data.ctaText ?? '',
      },
    })
  }

  /**
   * Atualiza post. Bloqueia edição de posts com status PUBLISHED.
   * Retorna erro estruturado se post já publicado.
   */
  static async update(id: string, data: UpdatePostInput) {
    const post = await prisma.post.findUnique({ where: { id } })
    if (!post) return null

    if (post.status === ContentStatus.PUBLISHED) {
      throw new Error('Posts publicados não podem ser editados')
    }

    return prisma.post.update({
      where: { id },
      data: {
        ...(data.caption && { caption: data.caption }),
        ...(data.hashtags && { hashtags: data.hashtags }),
        ...(data.ctaText !== undefined && { ctaText: data.ctaText }),
        ...(data.ctaUrl !== undefined && { ctaUrl: data.ctaUrl }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        ...(data.scheduledAt && { scheduledAt: new Date(data.scheduledAt) }),
      },
    })
  }

  /**
   * Aprova post — seta approvedAt. INT-070.
   * Cria registro de audit log (COMP-001).
   */
  static async approve(id: string) {
    const now = new Date()

    const [post] = await Promise.all([
      prisma.post.update({
        where: { id },
        data: { approvedAt: now, status: ContentStatus.APPROVED },
      }),
      prisma.publishAuditLog.create({
        data: {
          postId: id,
          action: 'approve',
          result: 'success',
          attempts: 1,
        },
      }),
    ])

    return post
  }

  /**
   * Deleta post. Cascade remove PublishingQueue e PublishAuditLog.
   */
  static async delete(id: string) {
    return prisma.post.delete({ where: { id } })
  }

  /**
   * Cria post a partir de ContentPiece (CX-03).
   * Adapta conteúdo para o canal via channel-adapter.
   */
  static async createFromContent(contentPieceId: string, channel: string) {
    const contentPiece = await prisma.contentPiece.findUnique({
      where: { id: contentPieceId },
      include: { angles: { where: { isSelected: true }, take: 1 } },
    })

    if (!contentPiece) return null

    const adapted = adaptForChannel(
      {
        body: contentPiece.angles[0]?.editedBody ?? contentPiece.editedText ?? '',
        tags: [],
        imageUrl: contentPiece.generatedImageUrl ?? undefined,
      },
      channel
    )

    return prisma.post.create({
      data: {
        contentPieceId,
        channel: channel as Channel,
        caption: adapted.caption,
        hashtags: adapted.hashtags,
        imageUrl: adapted.imageUrl ?? contentPiece.generatedImageUrl,
        ctaText: adapted.ctaText,
        ctaUrl: adapted.ctaUrl,
        status: ContentStatus.DRAFT,
        cta: adapted.ctaText ?? '',
      },
    })
  }
}
