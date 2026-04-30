// Module-11: Blog Admin Service — CRUD completo com aprovação e publicação
// Rastreabilidade: TASK-2 ST001, FEAT-publishing-blog-001, FEAT-publishing-blog-006, QUAL-005
// Error Catalog: BLOG_001, BLOG_020, BLOG_050, BLOG_080, VAL_001, VAL_020

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import type { BlogArticle as PrismaBlogArticle, BlogArticleVersion as PrismaBlogArticleVersion } from '@prisma/client'
import type { BlogArticle, HreflangConfig, PaginatedArticles } from '@/types/blog'
import type { CreateArticleInput, UpdateArticleInput, ApproveArticleInput, ListArticlesInput } from '@/lib/validators/blog-article'
import { blogVersionService } from './blog-version.service'
import { BLOG_STATUS } from '@/constants/status'
import { SUPPORTED_LOCALES } from '@/types'
import { buildSearchWhere } from '@/lib/search/text-search'

/**
 * Converte tipo Prisma para domínio.
 * Único cast necessário: hreflang (Json? no schema → JsonValue no Prisma, HreflangConfig na interface).
 */
function mapBlogArticle(
  article: PrismaBlogArticle & { versions?: PrismaBlogArticleVersion[] },
): BlogArticle {
  return {
    ...article,
    hreflang: article.hreflang as HreflangConfig | null,
  }
}

// ─── Listagem Admin ──────────────────────────────────────────────────────────

export async function listArticles(params: ListArticlesInput): Promise<PaginatedArticles> {
  const { page, limit, status, search } = params
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = status ? { status } : {}
  const searchWhere = buildSearchWhere(search, ['title', 'slug', 'body'] as const)
  if (searchWhere) Object.assign(where, searchWhere)

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
    items: items.map(mapBlogArticle),
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

  return mapBlogArticle(article)
}

// ─── Leitura ─────────────────────────────────────────────────────────────────

/** Retorna artigo por ID para painel admin (sem filtro de status) */
export async function getArticle(id: string): Promise<BlogArticle | null> {
  const article = await prisma.blogArticle.findUnique({
    where: { id },
    include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
  })
  return article ? mapBlogArticle(article) : null
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

  // Intake-Review TASK-2 (CL-298): registrar BlogSlugRedirect 301 quando slug
  // muda em artigo publicado. Rascunhos nao geram redirect.
  const slugChanged =
    typeof updateData.slug === 'string' &&
    updateData.slug !== existing.slug &&
    existing.status === BLOG_STATUS.PUBLISHED

  const updated = await prisma.$transaction(async (tx) => {
    if (slugChanged) {
      await tx.blogSlugRedirect.upsert({
        where: { oldSlug: existing.slug },
        create: {
          oldSlug: existing.slug,
          newSlug: updateData.slug!,
          articleId: existing.id,
        },
        update: { newSlug: updateData.slug!, articleId: existing.id },
      })
      await tx.blogSlugRedirect.updateMany({
        where: { newSlug: existing.slug },
        data: { newSlug: updateData.slug! },
      })
    }

    return tx.blogArticle.update({
      where: { id },
      data: {
        ...updateData,
        hreflang: updateData.hreflang ?? undefined,
        ctaType: updateData.ctaType ?? undefined,
        ...(bodyChanged || titleChanged ? { currentVersion: existing.currentVersion + 1 } : {}),
      },
    })
  })

  return mapBlogArticle(updated)
}

// ─── Aprovação Humana ────────────────────────────────────────────────────────

/**
 * Registra aprovação humana obrigatória.
 * Sem aprovação: POST /publish retorna 403 (BLOG_050).
 * Rastreabilidade: FEAT-publishing-blog-006
 */
export async function approveArticle(id: string, input: ApproveArticleInput): Promise<BlogArticle> {
  const article = await prisma.blogArticle.findUniqueOrThrow({ where: { id } })

  if (article.status === BLOG_STATUS.PUBLISHED) {
    throw new Error('Artigo já está publicado')
  }

  const updated = await prisma.blogArticle.update({
    where: { id },
    data: {
      approvedAt: new Date(),
      approvedBy: input.approvedBy,
      status: BLOG_STATUS.REVIEW,
    },
  })

  return mapBlogArticle(updated)
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

  // BLOG_051 (M10.15): Cada locale traduzido precisa de revisão humana antes da publicação.
  // Traduções em DRAFT ou REJECTED bloqueiam a publicação até serem APPROVED.
  const pendingTranslations = await prisma.blogArticleTranslation.findMany({
    where: { articleId: id, status: { not: 'APPROVED' } },
    select: { locale: true, status: true },
  })
  if (pendingTranslations.length > 0) {
    const summary = pendingTranslations
      .map((t) => `${t.locale}:${t.status}`)
      .join(', ')
    throw new Error(
      `BLOG_051: Traduções pendentes de revisão humana — ${summary}. Aprovar cada locale antes de publicar.`,
    )
  }

  const published = await prisma.blogArticle.update({
    where: { id },
    data: {
      status: BLOG_STATUS.PUBLISHED,
      publishedAt: article.publishedAt ?? new Date(),
    },
  })

  // ISR: revalidar rotas públicas com prefixo de locale (NEXT-002)
  for (const locale of SUPPORTED_LOCALES) {
    revalidatePath(`/${locale}/blog`)
    revalidatePath(`/${locale}/blog/${published.slug}`)
  }
  revalidatePath('/sitemap.xml')

  return mapBlogArticle(published)
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
