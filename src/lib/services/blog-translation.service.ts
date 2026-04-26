/**
 * BlogTranslationService — Intake Review TASK-13 ST001 (CL-165..168).
 *
 * Gera variantes de um BlogArticle via Claude por locale alvo. Preserva estrutura
 * markdown (headings, JSON-LD inline, links) e upserta como BlogArticleTranslation.
 *
 * Retry: ate 2 tentativas com backoff exponencial.
 */
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { captureException } from '@/lib/sentry'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MODEL = 'claude-opus-4-7'
const MAX_TOKENS = 4000

const LOCALE_LABEL: Record<string, string> = {
  'en-US': 'English (United States)',
  'en': 'English (United States)',
  'it-IT': 'Italian (Italy)',
  'es-ES': 'Spanish (Spain)',
}

export interface TranslateResult {
  locale: string
  status: 'DRAFT' | 'FAILED'
  translationId?: string
  error?: string
}

function buildPrompt(source: {
  title: string
  body: string
  excerpt?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
}, targetLocale: string): string {
  const label = LOCALE_LABEL[targetLocale] ?? targetLocale
  return `You are a bilingual editor translating a Brazilian Portuguese blog article into ${label}.

CRITICAL RULES:
- Preserve ALL markdown structure: headings (same level), lists, code blocks, links.
- Preserve any inline JSON-LD or schema.org blocks verbatim.
- Translate naturally for the ${label} audience (not literal).
- Keep proper nouns and brand names unchanged.
- Output STRICT JSON only, no prose:
  {
    "title": "...",
    "slug": "kebab-case-slug",
    "metaTitle": "... (max 70 chars)",
    "metaDescription": "... (max 160 chars)",
    "excerpt": "... (max 500 chars)",
    "contentMd": "full translated markdown"
  }

SOURCE (pt-BR):
Title: ${source.title}
${source.metaTitle ? `Meta title: ${source.metaTitle}` : ''}
${source.metaDescription ? `Meta description: ${source.metaDescription}` : ''}
${source.excerpt ? `Excerpt: ${source.excerpt}` : ''}

Content:
${source.body}
`
}

async function callClaude(prompt: string, attempt = 1): Promise<string> {
  try {
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
    })
    const first = resp.content[0]
    if (first.type !== 'text') throw new Error('Non-text response from Claude')
    return first.text
  } catch (err) {
    if (attempt < 2) {
      const wait = 500 * Math.pow(2, attempt)
      await new Promise((r) => setTimeout(r, wait))
      return callClaude(prompt, attempt + 1)
    }
    throw err
  }
}

function parseJson(raw: string): {
  title: string
  slug: string
  metaTitle?: string
  metaDescription?: string
  excerpt?: string
  contentMd: string
} {
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON object found in Claude response')
  return JSON.parse(match[0])
}

/**
 * Traduz um artigo para um locale alvo e faz upsert em BlogArticleTranslation.
 */
export async function translateArticle(
  slug: string,
  targetLocale: string,
): Promise<TranslateResult> {
  const article = await prisma.blogArticle.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      body: true,
      excerpt: true,
      metaTitle: true,
      metaDescription: true,
    },
  })

  if (!article) {
    return { locale: targetLocale, status: 'FAILED', error: 'Artigo nao encontrado' }
  }

  const prompt = buildPrompt(article, targetLocale)

  try {
    const raw = await callClaude(prompt)
    const parsed = parseJson(raw)

    const upserted = await prisma.blogArticleTranslation.upsert({
      where: {
        UQ_blog_article_translations_article_locale: {
          articleId: article.id,
          locale: targetLocale,
        },
      },
      create: {
        articleId: article.id,
        locale: targetLocale,
        title: parsed.title,
        slug: parsed.slug,
        metaTitle: parsed.metaTitle?.slice(0, 70) ?? null,
        metaDescription: parsed.metaDescription?.slice(0, 160) ?? null,
        excerpt: parsed.excerpt?.slice(0, 500) ?? null,
        contentMd: parsed.contentMd,
        status: 'DRAFT',
        translatedBy: 'MACHINE',
      },
      update: {
        title: parsed.title,
        slug: parsed.slug,
        metaTitle: parsed.metaTitle?.slice(0, 70) ?? null,
        metaDescription: parsed.metaDescription?.slice(0, 160) ?? null,
        excerpt: parsed.excerpt?.slice(0, 500) ?? null,
        contentMd: parsed.contentMd,
        status: 'DRAFT',
        translatedBy: 'MACHINE',
      },
    })

    return { locale: targetLocale, status: 'DRAFT', translationId: upserted.id }
  } catch (err) {
    captureException(err, { context: 'blog-translation', slug, locale: targetLocale })
    return {
      locale: targetLocale,
      status: 'FAILED',
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

/**
 * Gera traducoes em paralelo para varios locales.
 */
export async function translateArticleToLocales(
  slug: string,
  locales: string[],
): Promise<TranslateResult[]> {
  return Promise.all(locales.map((l) => translateArticle(slug, l)))
}
