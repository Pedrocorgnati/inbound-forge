import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase-server'
import {
  translateArticle,
  TranslationBudgetExceededError,
  TranslationProviderError,
} from '@/lib/translation/article-translator.service'
import { SUPPORTED_TRANSLATION_LOCALES, type TranslationLocale } from '@/lib/prompts/translate-article'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  locales: z.array(z.enum(SUPPORTED_TRANSLATION_LOCALES as unknown as [TranslationLocale, ...TranslationLocale[]])).min(1).max(4),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ code: 'SESSION_REQUIRED' }, { status: 401 })
  }

  const { id } = await params
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ code: 'ERR-001', message: 'JSON invalido' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'ERR-001', message: 'Body invalido', issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const results: unknown[] = []
  const errors: Array<{ locale: string; code: string; message: string }> = []

  for (const locale of parsed.data.locales) {
    try {
      const r = await translateArticle(id, locale)
      results.push(r)
    } catch (err) {
      if (err instanceof TranslationBudgetExceededError) {
        return NextResponse.json(
          { code: 'BUDGET_EXCEEDED', message: err.message, results, errors },
          { status: 402 }
        )
      }
      if (err instanceof TranslationProviderError) {
        errors.push({ locale, code: 'TRANSLATION_PROVIDER_ERROR', message: err.message })
        continue
      }
      errors.push({ locale, code: 'ERR-500', message: err instanceof Error ? err.message : String(err) })
    }
  }

  return NextResponse.json({ results, errors }, { status: errors.length ? 207 : 200 })
}
