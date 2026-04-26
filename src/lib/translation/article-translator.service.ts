import { prisma } from '@/lib/prisma'
import { trackCost } from '@/lib/cost-tracking'
import {
  buildTranslationPrompt,
  type TranslationLocale,
  SUPPORTED_TRANSLATION_LOCALES,
} from '@/lib/prompts/translate-article'

const COST_PER_INPUT_TOKEN = 0.00000015
const COST_PER_OUTPUT_TOKEN = 0.0000006

export class TranslationBudgetExceededError extends Error {
  code = 'BUDGET_EXCEEDED'
  constructor(message = 'Daily translation budget exceeded') {
    super(message)
  }
}

export class TranslationProviderError extends Error {
  code = 'TRANSLATION_PROVIDER_ERROR'
}

export type TranslationResult = {
  locale: TranslationLocale
  title: string
  slug: string
  metaTitle: string | null
  metaDescription: string | null
  excerpt: string | null
  contentMd: string
  tokensUsed: number
  costUsd: number
}

async function callProvider(prompt: { system: string; user: string }): Promise<{
  json: Record<string, unknown>
  inputTokens: number
  outputTokens: number
}> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new TranslationProviderError('OPENAI_API_KEY ausente')
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_TRANSLATION_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    }),
  })

  if (!res.ok) {
    throw new TranslationProviderError(`HTTP ${res.status}`)
  }
  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>
    usage?: { prompt_tokens?: number; completion_tokens?: number }
  }
  const content = data.choices?.[0]?.message?.content || '{}'
  const inputTokens = data.usage?.prompt_tokens ?? 0
  const outputTokens = data.usage?.completion_tokens ?? 0
  return { json: JSON.parse(content) as Record<string, unknown>, inputTokens, outputTokens }
}

export async function translateArticle(
  articleId: string,
  targetLocale: TranslationLocale
): Promise<TranslationResult> {
  if (!SUPPORTED_TRANSLATION_LOCALES.includes(targetLocale)) {
    throw new Error(`Locale ${targetLocale} nao suportado`)
  }

  const dailyBudget = Number(process.env.LLM_COST_BUDGET_DAILY || '5')
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const todaySpend = await prisma.costLog.aggregate({
    where: { recordedAt: { gte: startOfDay }, operation: 'blog-translate' },
    _sum: { amount: true },
  })
  const spent = Number(todaySpend._sum.amount ?? 0)
  if (spent >= dailyBudget) {
    throw new TranslationBudgetExceededError(`spent=${spent} budget=${dailyBudget}`)
  }

  const article = await prisma.blogArticle.findUnique({ where: { id: articleId } })
  if (!article) throw new Error('Article not found')

  const prompt = buildTranslationPrompt({
    sourceLocale: 'pt-BR',
    targetLocale,
    title: article.title,
    excerpt: article.excerpt,
    contentMd: article.body,
    metaTitle: article.metaTitle,
    metaDescription: article.metaDescription,
  })

  const { json, inputTokens, outputTokens } = await callProvider(prompt)
  const tokensUsed = inputTokens + outputTokens
  const costUsd = inputTokens * COST_PER_INPUT_TOKEN + outputTokens * COST_PER_OUTPUT_TOKEN

  await trackCost({
    provider: 'other' as never,
    amount: costUsd,
    operation: 'blog-translate',
    metadata: { articleId, targetLocale, model: 'gpt-4o-mini', tokensUsed },
  })

  const title = String(json.title ?? article.title)
  const slug = String(json.slug ?? article.slug)
  const metaTitle = json.metaTitle ? String(json.metaTitle) : null
  const metaDescription = json.metaDescription ? String(json.metaDescription) : null
  const excerpt = json.excerpt ? String(json.excerpt) : null
  const contentMd = String(json.contentMd ?? article.body)

  await (prisma as unknown as {
    blogArticleTranslation: {
      upsert: (args: unknown) => Promise<unknown>
    }
  }).blogArticleTranslation.upsert({
    where: { articleId_locale: { articleId, locale: targetLocale } },
    create: {
      articleId,
      locale: targetLocale,
      title,
      slug,
      metaTitle,
      metaDescription,
      excerpt,
      contentMd,
      status: 'DRAFT',
      translatedBy: 'MACHINE',
      tokensUsed,
      costUsd,
    },
    update: {
      title,
      slug,
      metaTitle,
      metaDescription,
      excerpt,
      contentMd,
      status: 'DRAFT',
      translatedBy: 'MACHINE',
      tokensUsed,
      costUsd,
    },
  })

  return {
    locale: targetLocale,
    title,
    slug,
    metaTitle,
    metaDescription,
    excerpt,
    contentMd,
    tokensUsed,
    costUsd,
  }
}
