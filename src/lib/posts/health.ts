// Posts health helpers — CL-149 (TASK-7 ST001)
import 'server-only'
import { prisma } from '@/lib/prisma'

const STUCK_HOURS = 48

/**
 * Retorna IDs de posts agendados há mais de 48h sem publicação.
 * Usado pelo endpoint /api/posts/stuck e pelo badge na UI.
 */
export async function getStuckPosts(): Promise<string[]> {
  const threshold = new Date()
  threshold.setHours(threshold.getHours() - STUCK_HOURS)

  const posts = await prisma.post.findMany({
    where: {
      scheduledAt: { lte: threshold },
      publishedAt: null,
    },
    select: { id: true },
  })

  return posts.map((p) => p.id)
}
