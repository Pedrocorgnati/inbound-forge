// Module-11: Blog Version Service — versionamento de artigos
// Rastreabilidade: TASK-4 ST001, FEAT-publishing-blog-005, SEC-007
// Error Catalog: BLOG_001, BLOG_081, BLOG_082, SYS_001

import { prisma } from '@/lib/prisma'
import type { BlogArticleVersion } from '@/types/blog'

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface CreateVersionInput {
  versionNumber: number
  title: string
  body: string
  changeNote?: string
}

// ─── Criação de Versão ────────────────────────────────────────────────────────

/**
 * Salva snapshot do artigo antes de uma mudança.
 * Chamado por blog-admin.service quando body ou title muda.
 */
export async function createVersion(
  articleId: string,
  input: CreateVersionInput,
): Promise<BlogArticleVersion> {
  const version = await prisma.blogArticleVersion.create({
    data: {
      articleId,
      versionNumber: input.versionNumber,
      title: input.title,
      body: input.body,
      changeNote: input.changeNote ?? 'Atualização automática',
    },
  })
  return version as unknown as BlogArticleVersion
}

// ─── Listagem ────────────────────────────────────────────────────────────────

/** Lista versões do artigo em ordem decrescente. */
export async function listVersions(articleId: string): Promise<BlogArticleVersion[]> {
  const versions = await prisma.blogArticleVersion.findMany({
    where: { articleId },
    orderBy: { versionNumber: 'desc' },
  })
  return versions as unknown as BlogArticleVersion[]
}

// ─── Leitura ────────────────────────────────────────────────────────────────

/**
 * Retorna versão específica.
 * Valida ownership (BLOG_081): versionId deve pertencer ao articleId.
 */
export async function getVersion(
  articleId: string,
  versionId: string,
): Promise<BlogArticleVersion> {
  const version = await prisma.blogArticleVersion.findUnique({
    where: { id: versionId },
  })

  if (!version || version.articleId !== articleId) {
    // BLOG_081: Versão não pertence a este artigo
    throw new Error('BLOG_081: Versão não encontrada ou não pertence a este artigo')
  }

  return version as unknown as BlogArticleVersion
}

// ─── Rollback ────────────────────────────────────────────────────────────────

/**
 * Restaura artigo para versão anterior.
 * NUNCA altera status — artigo PUBLISHED continua PUBLISHED.
 * Salva estado atual como nova versão antes do rollback.
 */
export async function rollback(
  articleId: string,
  versionId: string,
  changeNote?: string,
): Promise<{ success: true; currentVersion: number }> {
  const [version, article] = await Promise.all([
    getVersion(articleId, versionId),
    prisma.blogArticle.findUniqueOrThrow({ where: { id: articleId } }),
  ])

  // Salvar estado atual como nova versão antes do rollback
  await createVersion(articleId, {
    versionNumber: article.currentVersion,
    title: article.title,
    body: article.body,
    changeNote: `Antes do rollback para v${version.versionNumber}`,
  })

  const nextVersion = article.currentVersion + 1

  // Restaurar title e body da versão escolhida; NUNCA alterar status
  await prisma.blogArticle.update({
    where: { id: articleId },
    data: {
      title: version.title,
      body: version.body,
      currentVersion: nextVersion,
    },
  })

  return { success: true, currentVersion: nextVersion }
}

// ─── Salvar estado atual como versão ────────────────────────────────────────

/** Helper: salva estado atual antes de operações destrutivas. */
export async function saveCurrentStateAsVersion(
  articleId: string,
  changeNote: string,
): Promise<BlogArticleVersion> {
  const article = await prisma.blogArticle.findUniqueOrThrow({ where: { id: articleId } })
  return createVersion(articleId, {
    versionNumber: article.currentVersion,
    title: article.title,
    body: article.body,
    changeNote,
  })
}

export const blogVersionService = {
  createVersion,
  listVersions,
  getVersion,
  rollback,
  saveCurrentStateAsVersion,
}
