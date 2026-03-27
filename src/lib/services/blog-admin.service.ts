// Module-11: Blog Admin Service — CRUD completo com aprovação e publicação
// Rastreabilidade: TASK-2 ST001, FEAT-publishing-blog-001, FEAT-publishing-blog-006, QUAL-005
// Error Catalog: BLOG_001, BLOG_020, BLOG_050, BLOG_080, VAL_001, VAL_020

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import type { BlogArticle, PaginatedArticles } from '@/types/blog'
import type { CreateArticleInput, UpdateArticleInput, ApproveArticleInput, ListArticlesInput } from '@/lib/validators/blog-article'
import { blogVersionService } from './blog-version.service'

// ─── Listagem Admin ──────────────────────────────────────────────────────────

export async function listArticles(params: ListArticlesInput): Promise<PaginatedArticles> {
  const { page, limit, status } = params
  const skip = (page - 1) * limit

  const where = status ? { status } : {}

  const [items, total] = await prisma.$transaction([
    prisma.blogArticle.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.blogArticle.count({ where }),
  ])

  return {
    items: items as unknown as BlogArticle[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}

// ─── Criação ─────────────────────────────────────────────────────────────────

/**
 * Cria novo artigo.
 * Erros: BLOG_020 (slug duplicado), VAL_001 (campo ausente)
 */
export async function createArticle(input: CreateArticleInput): Promise<BlogArticle> {
  const { changeNote: _changeNote, ...data } = input

  const article = await prisma.blogArticle.create({
    data: {
      ...data,
      status: data.status ?? 'DRAFT',
      authorName: data.authorName ?? 'Pedro Corgnati',
      hreflang: data.hreflang ?? undefined,
      ctaType: data.ctaType ?? undefined,
    },
  })

  return article as unknown as BlogArticle
}

// ─── Leitura ─────────────────────────────────────────────────────────────────

/** Retorna artigo por ID para painel admin (sem filtro de status) */
export async function getArticle(id: string): Promise<BlogArticle | null> {
  const article = await prisma.blogArticle.findUnique({
    where: { id },
    include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
  })
  return article as unknown as BlogArticle | null
}

// ─── Atualização com versionamento automático ─────────────────────────────────

/**
 * Atualiza artigo e cria versão automaticamente se body ou title mudou.
 * Rastreabilidade: FEAT-publishing-blog-005
 */
export async function updateArticle(id: string, input: UpdateArticleInput): Promise<BlogArticle> {
  const existing = await prisma.blogArticle.findUniqueOrThrow({ where: { id } })

  const bodyChanged = input.body !== undefined && input.body !== existing.body
  const titleChanged = input.title !== undefined && input.title !== existing.title

  if (bodyChanged || titleChanged) {
    // Salvar snapshot antes de aplicar mudanças (FEAT-publishing-blog-005)
    await blogVersionService.createVersion(id, {
      versionNumber: existing.currentVersion,
      title: existing.title,
      body: existing.body,
      changeNote: input.changeNote ?? 'Atualização automática',
    })
  }

  const { changeNote: _changeNote, ...updateData } = input

  const updated = await prisma.blogArticle.update({
    where: { id },
    data: {
      ...updateData,
      hreflang: updateData.hreflang ?? undefined,
      ctaType: updateData.ctaType ?? undefined,
      ...(bodyChanged || titleChanged ? { currentVersion: existing.currentVersion + 1 } : {}),
    },
  })

  return updated as unknown as BlogArticle
}

// ─── Aprovação Humana ────────────────────────────────────────────────────────

/**
 * Registra aprovação humana obrigatória.
 * Sem aprovação: POST /publish retorna 403 (BLOG_050).
 * Rastreabilidade: FEAT-publishing-blog-006
 */
export async function approveArticle(id: string, input: ApproveArticleInput): Promise<BlogArticle> {
  const article = await prisma.blogArticle.findUniqueOrThrow({ where: { id } })

  if (article.status === 'PUBLISHED') {
    throw new Error('Artigo já está publicado')
  }

  const updated = await prisma.blogArticle.update({
    where: { id },
    data: {
      approvedAt: new Date(),
      approvedBy: input.approvedBy,
      status: 'REVIEW',
    },
  })

  return updated as unknown as BlogArticle
}

// ─── Publicação ──────────────────────────────────────────────────────────────

/**
 * Publica artigo. Requer aprovação prévia (BLOG_050).
 * Chama revalidatePath para atualizar ISR (NEXT-002).
 */
export async function publishArticle(id: string): Promise<BlogArticle> {
  const article = await prisma.blogArticle.findUniqueOrThrow({ where: { id } })

  // BLOG_050: Aprovação obrigatória antes de publicar
  if (!article.approvedAt) {
    throw new Error(
      'BLOG_050: Artigo precisa ser aprovado antes de ser publicado. Acesse a tela de revisão.',
    )
  }

  const published = await prisma.blogArticle.update({
    where: { id },
    data: {
      status: 'PUBLISHED',
      publishedAt: article.publishedAt ?? new Date(),
    },
  })

  // ISR: revalidar rotas públicas (NEXT-002)
  revalidatePath('/blog')
  revalidatePath(`/blog/${published.slug}`)
  revalidatePath('/sitemap.xml')

  return published as unknown as BlogArticle
}

// ─── Exclusão ────────────────────────────────────────────────────────────────

/** Remove artigo e todas as versões (CASCADE no banco). */
export async function deleteArticle(id: string): Promise<void> {
  await prisma.blogArticle.delete({ where: { id } })
}

export const blogAdminService = {
  listArticles,
  createArticle,
  getArticle,
  updateArticle,
  approveArticle,
  publishArticle,
  deleteArticle,
}
