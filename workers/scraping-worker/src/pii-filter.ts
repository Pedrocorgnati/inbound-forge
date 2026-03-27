/**
 * PII Filter — Scraping Worker
 * TASK-3 ST001 / module-6-scraping-worker
 *
 * Detecta PII em textos raspados (CPF, CNPJ, email, telefone, CEP).
 * SEC-008: logs NUNCA contêm o conteúdo dos textos.
 * COMP-006: usado antes de persistir processedText.
 */

export interface PiiFilterResult {
  hasPII: boolean
  categories: string[]
  matches: number
  partial?: boolean
}

const PII_DEFINITIONS: { name: string; regex: RegExp }[] = [
  { name: 'cpf', regex: /\d{3}[\.\s]?\d{3}[\.\s]?\d{3}[-\s]?\d{2}/g },
  { name: 'cnpj', regex: /\d{2}[\.\s]?\d{3}[\.\s]?\d{3}[\/\s]?\d{4}[-\s]?\d{2}/g },
  { name: 'email', regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
  { name: 'phone', regex: /(\+55\s?)?\(?\d{2}\)?[\s.-]?\d{4,5}[\s.-]?\d{4}/g },
  { name: 'cep', regex: /\d{5}[-\s]?\d{3}/g },
]

const PROCESSING_TIMEOUT_MS = 5_000
const LARGE_TEXT_THRESHOLD = 100 * 1024 // 100KB

/**
 * Detecta PII em um texto.
 * DEGRADED: textos > 100KB recebem timeout de 5s.
 */
export async function detectPII(text: string, scrapedTextId?: string): Promise<PiiFilterResult> {
  if (!text) {
    return { hasPII: false, categories: [], matches: 0 }
  }

  const isLargeText = text.length > LARGE_TEXT_THRESHOLD

  const detectionPromise = new Promise<PiiFilterResult>((resolve) => {
    try {
      const categories: string[] = []
      let totalMatches = 0

      for (const { name, regex } of PII_DEFINITIONS) {
        regex.lastIndex = 0 // Reset global regex state
        const matchCount = (text.match(regex) ?? []).length
        if (matchCount > 0) {
          categories.push(name)
          totalMatches += matchCount
        }
      }

      resolve({ hasPII: categories.length > 0, categories, matches: totalMatches })
    } catch (err) {
      // ERROR: regex compilation error — fail safe
      console.error(
        `[PiiFilter] PII_FILTER_ERROR: regex compile failed | id=${scrapedTextId ?? 'unknown'}`
      )
      resolve({ hasPII: false, categories: [], matches: 0 })
    }
  })

  if (!isLargeText) {
    return detectionPromise
  }

  // DEGRADED: timeout para textos grandes
  const timeoutPromise = new Promise<PiiFilterResult>((resolve) =>
    setTimeout(() => {
      console.warn(`[PiiFilter] Timeout on large text | id=${scrapedTextId ?? 'unknown'} | size=${text.length}`)
      resolve({ hasPII: true, categories: ['TIMEOUT'], matches: 0, partial: true })
    }, PROCESSING_TIMEOUT_MS)
  )

  return Promise.race([detectionPromise, timeoutPromise])
}

/**
 * Versão síncrona para uso em pipelines sem async.
 */
export function detectPIISync(text: string): PiiFilterResult {
  if (!text) return { hasPII: false, categories: [], matches: 0 }

  try {
    const categories: string[] = []
    let totalMatches = 0

    for (const { name, regex } of PII_DEFINITIONS) {
      regex.lastIndex = 0
      const matchCount = (text.match(regex) ?? []).length
      if (matchCount > 0) {
        categories.push(name)
        totalMatches += matchCount
      }
    }

    return { hasPII: categories.length > 0, categories, matches: totalMatches }
  } catch {
    return { hasPII: false, categories: [], matches: 0 }
  }
}
