/**
 * LinkedIn Formatter — module-12-calendar-publishing
 * Formata texto para publicação manual no LinkedIn (INT-117 — sem API LinkedIn).
 * Remove markdown, extrai gancho, monta estrutura otimizada.
 * INT-117 | INT-118 | INT-129 | FEAT-publishing-blog-001
 */
import type { Post } from '@prisma/client'
import { PUBLISHING_CHANNELS } from '@/lib/constants/publishing'

export interface LinkedInFormattedPost {
  hook: string
  body: string
  ctaBlock: string
  hashtagsLine: string
  fullText: string
  imageUrl: string | null
  charCount: number
  warnings: string[]
}

const LINKEDIN_MAX_CHARS = PUBLISHING_CHANNELS.LINKEDIN.maxCaptionLength
const LINKEDIN_MAX_HASHTAGS = PUBLISHING_CHANNELS.LINKEDIN.maxHashtags

/**
 * Remove formatação markdown do texto.
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // remove **bold**
    .replace(/\*(.*?)\*/g, '$1') // remove *italic*
    .replace(/#{1,6}\s/g, '') // remove ## headers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // remove [link](url) — mantém texto
    .replace(/`{1,3}([^`]+)`{1,3}/g, '$1') // remove `code`
    .trim()
}

/**
 * Extrai gancho (primeira sentença, máx 200 chars).
 * O gancho é a linha que aparece antes do "Ver mais" no LinkedIn.
 */
export function extractHook(text: string): string {
  const cleaned = stripMarkdown(text)

  // Primeira sentença (até ponto final, exclamação, interrogação ou quebra de linha)
  const match = cleaned.match(/^[^.!?\n]+[.!?]?/)
  const hook = match ? match[0].trim() : cleaned.slice(0, 200)

  return hook.slice(0, 200)
}

/**
 * Monta estrutura completa do post LinkedIn:
 * gancho → [linha em branco] → corpo → [linha em branco] → CTA → [linha em branco] → hashtags
 */
function assembleLinkedInPost(parts: {
  hook: string
  body: string
  ctaBlock: string
  hashtagsLine: string
}): string {
  const sections = [parts.hook]

  // Corpo sem o gancho (restante do texto)
  const bodyWithoutHook = parts.body.replace(parts.hook, '').trim()
  if (bodyWithoutHook) {
    sections.push(bodyWithoutHook)
  }

  if (parts.ctaBlock) sections.push(parts.ctaBlock)
  if (parts.hashtagsLine) sections.push(parts.hashtagsLine)

  // Seções separadas por linha em branco
  return sections.join('\n\n').trim()
}

/**
 * Formata post para LinkedIn.
 * Retorna texto estruturado + warnings de violações de limite.
 */
export function formatForLinkedIn(post: Post): LinkedInFormattedPost {
  const warnings: string[] = []

  const rawBody = stripMarkdown(post.caption)
  const hook = extractHook(rawBody)
  const ctaBlock = post.ctaText ? `👉 ${post.ctaText}` : ''

  // Hashtags: máx 5 para LinkedIn
  const allHashtags = post.hashtags ?? []
  if (allHashtags.length > LINKEDIN_MAX_HASHTAGS) {
    warnings.push(`Muitas hashtags (${allHashtags.length}/${LINKEDIN_MAX_HASHTAGS})`)
  }
  const hashtags = allHashtags.slice(0, LINKEDIN_MAX_HASHTAGS)
  const hashtagsLine = hashtags.join(' ')

  const fullText = assembleLinkedInPost({ hook, body: rawBody, ctaBlock, hashtagsLine })
  const charCount = fullText.length

  if (charCount > LINKEDIN_MAX_CHARS) {
    warnings.push(`Texto muito longo (${charCount}/${LINKEDIN_MAX_CHARS} chars)`)
  }

  return {
    hook,
    body: rawBody,
    ctaBlock,
    hashtagsLine,
    fullText,
    imageUrl: post.imageUrl,
    charCount,
    warnings,
  }
}
