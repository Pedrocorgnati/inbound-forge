export const SUPPORTED_TRANSLATION_LOCALES = ['pt-BR', 'en-US', 'it-IT', 'es-ES'] as const
export type TranslationLocale = (typeof SUPPORTED_TRANSLATION_LOCALES)[number]

const LOCALE_LABELS: Record<TranslationLocale, string> = {
  'pt-BR': 'Portugues do Brasil',
  'en-US': 'English (US)',
  'it-IT': 'Italiano',
  'es-ES': 'Espanol (Espana)',
}

export function buildTranslationPrompt(input: {
  sourceLocale: string
  targetLocale: TranslationLocale
  title: string
  excerpt: string
  contentMd: string
  metaTitle?: string | null
  metaDescription?: string | null
}): { system: string; user: string } {
  const targetLabel = LOCALE_LABELS[input.targetLocale]

  const system = [
    'You are a senior editorial translator specialised in B2B SaaS and technical content.',
    `Translate the article into ${targetLabel} (${input.targetLocale}).`,
    'Strict rules:',
    '- Preserve markdown formatting (headings, lists, code fences, blockquotes).',
    '- Preserve JSON-LD blocks verbatim.',
    '- Keep internal links intact (paths starting with /).',
    '- Keep proper nouns and brand names untranslated.',
    '- Keep an editorial, non-marketing tone.',
    '- Do NOT translate code identifiers inside backticks.',
    'Output a single JSON object with keys: title, slug, metaTitle, metaDescription, excerpt, contentMd. No prose outside the JSON.',
  ].join('\n')

  const user = JSON.stringify(
    {
      sourceLocale: input.sourceLocale,
      targetLocale: input.targetLocale,
      title: input.title,
      excerpt: input.excerpt,
      metaTitle: input.metaTitle ?? null,
      metaDescription: input.metaDescription ?? null,
      contentMd: input.contentMd,
    },
    null,
    2
  )

  return { system, user }
}
