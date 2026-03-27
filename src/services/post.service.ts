import { prisma } from '@/lib/prisma'
import type { CreatePostInput, UpdatePostInput } from '@/lib/validators/post'

export class PostService {
  async listPosts(page: number, limit: number, filters?: Record<string, unknown>) {
    const where = filters ?? {}
    const [data, total] = await Promise.all([
      prisma.post.findMany({ where, orderBy: { scheduledAt: 'asc' }, skip: (page - 1) * limit, take: limit }),
      prisma.post.count({ where }),
    ])
    return { data, total }
  }

  async createPost(_input: CreatePostInput) {
    // TODO: Implementar via /auto-flow execute
    throw new Error('Not implemented — run /auto-flow execute')
  }

  async updatePost(_id: string, _input: UpdatePostInput) {
    // TODO: Implementar via /auto-flow execute
    throw new Error('Not implemented — run /auto-flow execute')
  }

  async publishPost(_id: string) {
    // TODO: Implementar via /auto-flow execute
    // BLOG: publicar BlogArticle
    // LINKEDIN/INSTAGRAM: modo assistido
    throw new Error('Not implemented — run /auto-flow execute')
  }
}

export const postService = new PostService()
