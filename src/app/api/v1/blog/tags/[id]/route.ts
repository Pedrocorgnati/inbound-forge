// Intake Review TASK-9 ST001 (CL-264) — rename (PATCH) / delete (DELETE) tag.
// `id` eh o slug-like do nome atual. PATCH recebe `{ name }` novo.

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, badRequest, internalError, notFound } from '@/lib/api-auth'

interface Params {
  params: Promise<{ id: string }>
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function findTagName(id: string): Promise<string | null> {
  const articles = await prisma.blogArticle.findMany({ select: { tags: true } })
  for (const a of articles) {
    for (const t of a.tags ?? []) {
      if (slugify(t) === id) return t
    }
  }
  return null
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return badRequest('Body inválido')
  }
  const { name: newName } = (body ?? {}) as { name?: string }
  if (!newName || typeof newName !== 'string' || !newName.trim()) {
    return badRequest('name obrigatório')
  }

  try {
    const current = await findTagName(id)
    if (!current) return notFound('Tag não encontrada')
    const target = newName.trim()

    const articles = await prisma.blogArticle.findMany({
      where: { tags: { has: current } },
      select: { id: true, tags: true },
    })

    await prisma.$transaction(
      articles.map((a) => {
        const updated = Array.from(
          new Set((a.tags ?? []).map((t) => (t === current ? target : t))),
        )
        return prisma.blogArticle.update({
          where: { id: a.id },
          data: { tags: updated },
        })
      }),
    )

    return ok({ id: slugify(target), name: target, slug: slugify(target), updatedArticles: articles.length })
  } catch {
    return internalError()
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response
  const { id } = await params

  try {
    const current = await findTagName(id)
    if (!current) return notFound('Tag não encontrada')

    const count = await prisma.blogArticle.count({ where: { tags: { has: current } } })
    if (count > 0) {
      return badRequest(
        `Tag em uso em ${count} artigo(s). Use merge ou remova dos artigos antes de deletar.`,
      )
    }
    return ok({ deleted: true, tag: current })
  } catch {
    return internalError()
  }
}
