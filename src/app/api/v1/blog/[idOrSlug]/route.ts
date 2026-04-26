import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, notFound, validationError, internalError } from '@/lib/api-auth'
import { UpdateBlogArticleSchema } from '@/schemas/blog.schema'
import { BLOG_STATUS } from '@/constants/status'

type Params = { params: Promise<{ idOrSlug: string }> }

// GET /api/v1/blog/[idOrSlug] — público por slug
// TASK-21 ST001 (CL-287): se artigo existe mas status=DELETED, retorna 410
// Gone (permite ao Google remover do indice mais rapido que um 404).
export async function GET(_request: NextRequest, { params }: Params) {
  const { idOrSlug } = await params

  try {
    // Busca sem filtro de status para detectar DELETED separadamente.
    const article = await prisma.blogArticle.findFirst({
      where: { OR: [{ slug: idOrSlug }, { id: idOrSlug }] },
    })
    if (!article) return notFound('Artigo não encontrado')
    if (article.status === 'DELETED') {
      return new Response(
        JSON.stringify({
          code: 'GONE',
          message: 'Este conteúdo foi removido permanentemente.',
        }),
        {
          status: 410,
          headers: {
            'Content-Type': 'application/json',
            'X-Robots-Tag': 'noindex, nofollow',
            'Cache-Control': 'public, max-age=300, s-maxage=86400',
          },
        },
      )
    }
    if (article.status !== BLOG_STATUS.PUBLISHED) return notFound('Artigo não encontrado')
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

    // Intake-Review TASK-2 (CL-298): registrar redirect 301 automatico quando o
    // slug muda em artigo publicado. Rascunhos nao geram redirect.
    const slugChanged =
      typeof parsed.data.slug === 'string' &&
      parsed.data.slug !== existing.slug &&
      existing.status === BLOG_STATUS.PUBLISHED

    const updated = await prisma.$transaction(async (tx) => {
      if (slugChanged) {
        await tx.blogSlugRedirect.upsert({
          where: { oldSlug: existing.slug },
          create: {
            oldSlug: existing.slug,
            newSlug: parsed.data.slug!,
            articleId: existing.id,
          },
          update: { newSlug: parsed.data.slug!, articleId: existing.id },
        })
        // Se existir redirect apontando para o slug antigo (cadeia), re-aponta para o novo.
        await tx.blogSlugRedirect.updateMany({
          where: { newSlug: existing.slug },
          data: { newSlug: parsed.data.slug! },
        })
      }
      return tx.blogArticle.update({ where: { id: idOrSlug }, data: parsed.data })
    })
    return ok(updated)
  } catch {
    return internalError()
  }
}
