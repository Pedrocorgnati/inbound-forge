/**
 * TASK-11/ST001 (CL-218) — PATCH metadata de blog article sem tocar no body.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/api-auth'
import { postMetadataSchema } from '@/lib/validators/post-metadata.schema'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'JSON invalido' }, { status: 400 })
  }

  const parsed = postMetadataSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION', issues: parsed.error.issues } },
      { status: 400 }
    )
  }

  const article = await prisma.blogArticle.findUnique({ where: { id } })
  if (!article) {
    return NextResponse.json({ success: false, error: 'Artigo nao encontrado' }, { status: 404 })
  }

  const slugConflict = await prisma.blogArticle.findFirst({
    where: { slug: parsed.data.slug, NOT: { id } },
    select: { id: true },
  })
  if (slugConflict) {
    return NextResponse.json(
      { success: false, error: { code: 'SLUG_CONFLICT', message: 'Slug ja existe' } },
      { status: 409 }
    )
  }

  const updated = await prisma.blogArticle.update({
    where: { id },
    data: {
      slug: parsed.data.slug,
      tags: parsed.data.tags,
      featuredImageUrl: parsed.data.featuredImageUrl ?? null,
      coverImageAlt: parsed.data.coverImageAlt ?? null,
      authorName: parsed.data.authorName,
      publishedAt: parsed.data.publishedAt ? new Date(parsed.data.publishedAt) : null,
      metaTitle: parsed.data.metaTitle ?? null,
      metaDescription: parsed.data.metaDescription ?? null,
      canonicalUrl: parsed.data.canonicalUrl ?? null,
    },
    select: { id: true, slug: true, updatedAt: true },
  })

  return NextResponse.json({ success: true, data: updated })
}
