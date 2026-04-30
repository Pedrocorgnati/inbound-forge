/**
 * GEO Bonus (TASK-3/ST001, gap CL-126) — bonus de scoring para temas com
 * alto potencial de citacao por IA:
 *  - Titulo pergunta      (default +10%)
 *  - Dado quantitativo    (default  +5%)
 *  - Comparacao           (default +10%)
 * Teto configuravel via GEO_BONUS_CAP (default 25%).
 */

export interface ThemePayload {
  title: string
  isComparison?: boolean
  tags?: string[]
}

export interface GeoBonusResult {
  isQuestion: boolean
  hasData: boolean
  isComparison: boolean
  totalBonus: number
}

function env(name: string, fallback: number): number {
  const v = Number(process.env[name])
  return Number.isFinite(v) ? v : fallback
}

const BONUS_QUESTION = () => env('GEO_BONUS_QUESTION', 0.10)
const BONUS_DATA = () => env('GEO_BONUS_DATA', 0.05)
const BONUS_COMPARISON = () => env('GEO_BONUS_COMPARISON', 0.10)
const BONUS_CAP = () => env('GEO_BONUS_CAP', 0.25)

const QUESTION_REGEX = /^(por que|porque|como|quando|onde|o que|quem|qual|quanto)\b/i
const QUANTITATIVE_REGEX = /\b\d+([\.,]\d+)?\s?(%|R\$|\$|mil|milho|bilho|pessoas|clientes|horas?|dias?|meses?|anos?|reais?|USD|kg|km|tb|gb)(?:\b|(?!\w))|\b\d+x\b/i
const COMPARISON_KEYWORDS = /\b(vs\.?|versus|contra|comparado|melhor que|diferenca entre|x)\b/i

export function isQuestionTitle(title: string): boolean {
  const normalized = title.trim().toLowerCase().replace(/[¿?!.,]/g, '')
  return QUESTION_REGEX.test(normalized) || title.trim().endsWith('?')
}

export function containsQuantitativeData(title: string): boolean {
  return QUANTITATIVE_REGEX.test(title)
}

export function isComparisonTitle(theme: ThemePayload): boolean {
  if (theme.isComparison) return true
  if (COMPARISON_KEYWORDS.test(theme.title)) return true
  return Boolean(theme.tags?.some((t) => t.toLowerCase() === 'comparison' || t.toLowerCase() === 'vs'))
}

export function calculateGeoBonus(theme: ThemePayload): GeoBonusResult {
  const isQuestion = isQuestionTitle(theme.title)
  const hasData = containsQuantitativeData(theme.title)
  const isComparison = isComparisonTitle(theme)

  let total = 0
  if (isQuestion) total += BONUS_QUESTION()
  if (hasData) total += BONUS_DATA()
  if (isComparison) total += BONUS_COMPARISON()

  const totalBonus = Math.min(total, BONUS_CAP())
  return { isQuestion, hasData, isComparison, totalBonus }
}
