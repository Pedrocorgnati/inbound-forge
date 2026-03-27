import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, notFound, validationError, internalError } from '@/lib/api-auth'
import { UpdateBlogArticleSchema } from '@/schemas/blog.schema'

type Params = { params: Promise<{ idOrSlug: string }> }

// GET /api/v1/blog/[idOrSlug] — público por slug
export async function GET(_request: NextRequest, { params }: Params) {
  const { idOrSlug } = await params

  try {
    // Tenta por slug primeiro, depois por id
    const article = await prisma.blogArticle.findFirst({
      where: {
        OR: [
          { slug: idOrSlug },
          { id: idOrSlug },
        ],
        status: 'PUBLISHED',
      },
    })
    if (!article) return notFound('Artigo não encontrado')
    return ok(article)
  } catch {
    return internalError()
  }
}

// PUT /api/v1/blog/[idOrSlug] — autenticado, por id
export async function PUT(request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { idOrSlug } = await params

  let body: unknown
  try { body = await request.json() } catch { return validationError(new Error('Body inválido')) }

  const parsed = UpdateBlogArticleSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const existing = await prisma.blogArticle.findUnique({ where: { id: idOrSlug } })
    if (!existing) return notFound('Artigo não encontrado')

    // Criar versão antes de atualizar
    if (parsed.data.body) {
      const versionCount = await prisma.blogArticleVersion.count({ where: { articleId: idOrSlug } })
      await prisma.blogArticleVersion.create({
        data: {
          articleId: idOrSlug,
          title: existing.title,
          body: existing.body,
          versionNumber: versionCount + 1,
        },
      })
    }

    const updated = await prisma.blogArticle.update({ where: { id: idOrSlug }, data: parsed.data })
    return ok(updated)
  } catch {
    return internalError()
  }
}
