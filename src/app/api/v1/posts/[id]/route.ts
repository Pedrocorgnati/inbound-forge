import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, notFound, validationError, internalError } from '@/lib/api-auth'
import { updatePostSchema as UpdatePostSchema } from '@/lib/validators/post'

type Params = { params: Promise<{ id: string }> }

// PUT /api/v1/posts/[id]
export async function PUT(request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { id } = await params

  let body: unknown
  try { body = await request.json() } catch { return validationError(new Error('Body inválido')) }

  const parsed = UpdatePostSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const existing = await prisma.post.findUnique({ where: { id } })
    if (!existing) return notFound('Post não encontrado')

    const updated = await prisma.post.update({
      where: { id },
      data: {
        ...parsed.data,
        ...(parsed.data.scheduledAt ? { scheduledAt: new Date(parsed.data.scheduledAt) } : {}),
      },
    })
    return ok(updated)
  } catch {
    return internalError()
  }
}

// DELETE /api/v1/posts/[id]
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { id } = await params

  try {
    const existing = await prisma.post.findUnique({ where: { id } })
    if (!existing) return notFound('Post não encontrado')

    await prisma.post.delete({ where: { id } })
    return ok({ message: 'Post removido' })
  } catch {
    return internalError()
  }
}
