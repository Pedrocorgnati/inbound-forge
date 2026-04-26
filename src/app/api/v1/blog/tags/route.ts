// Intake Review TASK-9 ST001 (CL-264) — catalogo de tags do blog (GET/POST).
// Tags sao armazenadas como `String[]` em BlogArticle — este endpoint agrega
// contagens dinamicamente. POST cria tag "vazia" adicionando em artigo alvo
// (opcional) ou apenas retorna 200 para compat.

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, badRequest, internalError } from '@/lib/api-auth'

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function GET() {
  const { response } = await requireSession()
  if (response) return response

  try {
    const articles = await prisma.blogArticle.findMany({ select: { tags: true } })
    const countByTag = new Map<string, number>()
    for (const a of articles) {
      for (const t of a.tags ?? []) {
        countByTag.set(t, (countByTag.get(t) ?? 0) + 1)
      }
    }
    const list = Array.from(countByTag.entries())
      .map(([name, count]) => ({ id: slugify(name), name, slug: slugify(name), count }))
      .sort((a, b) => b.count - a.count)
    return ok(list)
  } catch {
    return internalError()
  }
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
  const { name } = (body ?? {}) as { name?: string }
  if (!name || typeof name !== 'string' || !name.trim()) {
    return badRequest('name obrigatório')
  }
  // Sem modelo dedicado: criacao efetiva acontece ao aplicar em um artigo.
  // Retornamos o payload canonico para que o cliente registre localmente.
  const clean = name.trim()
  return ok({ id: slugify(clean), name: clean, slug: slugify(clean), count: 0 }, 201)
}
