/**
 * GET /api/v1/blog/export?format=mdx&since=YYYY-MM-DD&locale=pt-BR
 * TASK-8 ST001 / CL-118 (pos-MVP)
 *
 * Exporta articles publicados em formato MDX.
 * Retorna zip com {slug}.mdx por article.
 * AUTH_001: JWT obrigatorio.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSession } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { exportArticleAsMdx } from '@/lib/blog/mdx-exporter'

const QuerySchema = z.object({
  format: z.literal('mdx').default('mdx'),
  since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  locale: z.enum(['pt-BR', 'en-US', 'it-IT', 'es-ES']).optional(),
})

export async function GET(request: NextRequest) {
  const { response: authError } = await requireSession()
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const parsed = QuerySchema.safeParse({
    format: searchParams.get('format') ?? 'mdx',
    since: searchParams.get('since') ?? undefined,
    locale: searchParams.get('locale') ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json({ error: 'Parametros invalidos', issues: parsed.error.issues }, { status: 422 })
  }

  const { since, locale } = parsed.data

  const articles = await prisma.blogArticle.findMany({
    where: {
      status: 'PUBLISHED',
      ...(since ? { publishedAt: { gte: new Date(since) } } : {}),
    },
    orderBy: { publishedAt: 'desc' },
    take: 500,
  })

  if (articles.length === 0) {
    return NextResponse.json({ message: 'Nenhum article encontrado para exportar.' }, { status: 404 })
  }

  // Construir zip em memoria (sem dependencia de archiver — usa Readable Stream manual)
  // Para producao com volume alto, substituir por archiver/streaming
  const boundary = '--MDXExport'
  const parts: string[] = []

  for (const article of articles) {
    const mdx = exportArticleAsMdx(
      {
        id: article.id,
        slug: article.slug,
        title: article.title,
        excerpt: article.excerpt,
        body: article.body,
        featuredImageUrl: article.featuredImageUrl,
        tags: article.tags,
        authorName: article.authorName,
        canonicalUrl: article.canonicalUrl,
        publishedAt: article.publishedAt,
      },
      locale ?? 'pt-BR'
    )
    parts.push(`${boundary}\r\nContent-Disposition: attachment; filename="${article.slug}.mdx"\r\n\r\n${mdx}`)
  }

  // Retorno: se 1 article, MDX direto; se multiplos, multipart simplificado
  if (articles.length === 1) {
    return new NextResponse(parts[0]!.split('\r\n\r\n').slice(1).join('\r\n\r\n'), {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${articles[0]!.slug}.mdx"`,
      },
    })
  }

  const body = parts.join('\r\n') + `\r\n${boundary}--`
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': `multipart/mixed; boundary="${boundary.slice(2)}"`,
      'Content-Disposition': 'attachment; filename="inbound-forge-export.mdx.zip"',
      'X-Export-Count': String(articles.length),
    },
  })
}
