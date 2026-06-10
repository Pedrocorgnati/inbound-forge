// GET /api/posts/stuck — IDs de posts agendados > 48h sem publicação (CL-149 / TASK-7 ST001)
import { requireSession, ok, internalError } from '@/lib/api-auth'
import { getStuckPosts } from '@/lib/posts/health'

export async function GET() {
  const { response } = await requireSession()
  if (response) return response

  try {
    const ids = await getStuckPosts()
    return ok({ ids })
  } catch {
    return internalError()
  }
}
