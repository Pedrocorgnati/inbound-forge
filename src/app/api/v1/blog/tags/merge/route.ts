// Intake Review TASK-9 ST002 (CL-264) — merge de tag source em target.
// Move todos artigos da tag source para target e remove source dos arrays.

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, badRequest, internalError, notFound } from '@/lib/api-auth'

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

export async function POST(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return badRequest('Body inválido')
  }

  const { sourceId, targetId } = (body ?? {}) as {
    sourceId?: string
    targetId?: string
  }
  if (!sourceId || !targetId) return badRequest('sourceId e targetId obrigatórios')
  if (sourceId === targetId) return badRequest('source e target devem ser distintos')

  try {
    const source = await findTagName(sourceId)
    const target = await findTagName(targetId)
    if (!source) return notFound('Tag source não encontrada')
    if (!target) return notFound('Tag target não encontrada')

    const articles = await prisma.blogArticle.findMany({
      where: { tags: { has: source } },
      select: { id: true, tags: true },
    })

    await prisma.$transaction(
      articles.map((a) => {
        const next = Array.from(
          new Set(
            (a.tags ?? [])
              .filter((t) => t !== source)
              .concat([target]),
          ),
        )
        return prisma.blogArticle.update({
          where: { id: a.id },
          data: { tags: next },
        })
      }),
    )

    return ok({ moved: articles.length, source, target })
  } catch {
    return internalError()
  }
}
