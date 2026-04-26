// Intake Review TASK-5 ST005 (CL-164) — validador summary-first para artigos do blog.
// Regra: os primeiros 2 paragrafos devem conter ao menos metade das keywords-alvo
// (cobertura minima configurable) e totalizar >= 80 palavras (resposta direta,
// nao um teaser genérico).

export interface SummaryFirstInput {
  content: string
  keywords?: string[]
  minCoverageRatio?: number
  minWordCount?: number
}

export interface SummaryFirstResult {
  valid: boolean
  reason?: string
  coverageRatio?: number
  wordCount?: number
  matchedKeywords?: string[]
  missingKeywords?: string[]
}

const DEFAULT_MIN_COVERAGE = 0.5
const DEFAULT_MIN_WORDS = 80

function extractFirstParagraphs(content: string, limit = 2): string {
  if (!content) return ''
  const normalized = content.replace(/\r\n/g, '\n').trim()
  const blocks = normalized
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)
  const textBlocks = blocks.filter((b) => !b.startsWith('#') && !b.startsWith('---'))
  return textBlocks.slice(0, limit).join('\n\n')
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{Letter}\p{Number}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function countWords(text: string): number {
  if (!text) return 0
  return normalize(text).split(' ').filter(Boolean).length
}

export function validateSummaryFirst(input: SummaryFirstInput): SummaryFirstResult {
  const content = input.content ?? ''
  const keywords = (input.keywords ?? []).filter((k) => k && k.trim().length > 0)
  const minCoverage = input.minCoverageRatio ?? DEFAULT_MIN_COVERAGE
  const minWords = input.minWordCount ?? DEFAULT_MIN_WORDS

  const firstParagraphs = extractFirstParagraphs(content, 2)
  const wordCount = countWords(firstParagraphs)

  if (wordCount < minWords) {
    return {
      valid: false,
      reason: `Primeiros 2 paragrafos com ${wordCount} palavras (minimo ${minWords}).`,
      wordCount,
    }
  }

  if (keywords.length === 0) {
    return { valid: true, wordCount }
  }

  const normalizedSnippet = normalize(firstParagraphs)
  const matched: string[] = []
  const missing: string[] = []
  for (const kw of keywords) {
    const nk = normalize(kw)
    if (!nk) continue
    if (normalizedSnippet.includes(nk)) matched.push(kw)
    else missing.push(kw)
  }

  const coverageRatio = keywords.length > 0 ? matched.length / keywords.length : 1

  if (coverageRatio < minCoverage) {
    return {
      valid: false,
      reason: `Cobertura de keywords em summary-first insuficiente (${Math.round(
        coverageRatio * 100,
      )}% < ${Math.round(minCoverage * 100)}%).`,
      coverageRatio,
      wordCount,
      matchedKeywords: matched,
      missingKeywords: missing,
    }
  }

  return {
    valid: true,
    coverageRatio,
    wordCount,
    matchedKeywords: matched,
    missingKeywords: missing,
  }
}
