import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, okPaginated, validationError, internalError } from '@/lib/api-auth'
import { createClient } from '@/lib/supabase-server'
import { CreateBlogArticleSchema, ListBlogSchema } from '@/schemas/blog.schema'

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 255)
}

// GET /api/v1/blog — público retorna PUBLISHED, autenticado retorna todos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = ListBlogSchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      status: searchParams.get('status'),
    })

    // Verificar autenticação para filtros adicionais
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const where: Record<string, unknown> = user
      ? (parsed.status ? { status: parsed.status } : {})
      : { status: 'PUBLISHED' }

    const [data, total] = await Promise.all([
      prisma.blogArticle.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (parsed.page - 1) * parsed.limit,
        take: parsed.limit,
        omit: { body: true }, // listagem sem body para performance
      }),
      prisma.blogArticle.count({ where }),
    ])

    return okPaginated(data, { page: parsed.page, limit: parsed.limit, total })
  } catch {
    return internalError()
  }
}

// POST /api/v1/blog
export async function POST(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  let body: unknown
  try { body = await request.json() } catch { return validationError(new Error('Body inválido')) }

  const parsed = CreateBlogArticleSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const slug = slugify(parsed.data.title)

    const article = await prisma.blogArticle.create({
      data: { ...parsed.data, slug },
    })
    return ok(article, 201)
  } catch (err: unknown) {
    const e = err as { code?: string }
    if (e?.code === 'P2002') {
      return validationError(new Error('Slug já utilizado por outro artigo'))
    }
    return internalError()
  }
}
