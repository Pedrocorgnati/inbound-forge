/**
 * Anonymizer Pipeline — Scraping Worker
 * TASK-3 ST002 / module-6-scraping-worker
 *
 * Substitui PII detectado por placeholders padronizados.
 * SEC-008: log NUNCA contém rawText — apenas IDs e categorias.
 * COMP-006: processedText persiste sem PII; rawText descartado em 1h.
 */

export interface AnonymizationResult {
  processedText: string
  piiCategories: string[]
}

const PII_REPLACEMENTS: { name: string; regex: RegExp; placeholder: string }[] = [
  { name: 'cpf', regex: /\d{3}[\.\s]?\d{3}[\.\s]?\d{3}[-\s]?\d{2}/g, placeholder: '[CPF_REMOVIDO]' },
  { name: 'cnpj', regex: /\d{2}[\.\s]?\d{3}[\.\s]?\d{3}[\/\s]?\d{4}[-\s]?\d{2}/g, placeholder: '[CNPJ_REMOVIDO]' },
  { name: 'email', regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, placeholder: '[EMAIL_REMOVIDO]' },
  { name: 'phone', regex: /(\+55\s?)?\(?\d{2}\)?[\s.-]?\d{4,5}[\s.-]?\d{4}/g, placeholder: '[TELEFONE_REMOVIDO]' },
  { name: 'cep', regex: /\d{5}[-\s]?\d{3}/g, placeholder: '[CEP_REMOVIDO]' },
]

const CHUNK_SIZE = 50 * 1024 // 50KB

/**
 * Anonimiza um texto, substituindo PII por placeholders.
 * DEGRADED: textos grandes são processados em chunks de 50KB.
 */
export function anonymize(rawText: string, scrapedTextId?: string): AnonymizationResult {
  if (!rawText) {
    return { processedText: rawText, piiCategories: [] }
  }

  try {
    // Textos grandes: processar em chunks
    if (rawText.length > CHUNK_SIZE) {
      return processInChunks(rawText, scrapedTextId)
    }

    return processText(rawText)
  } catch (err) {
    // ERROR: falha no pipeline de anonimização — fail-safe: substituir tudo
    console.error(
      `[Anonymizer] Pipeline error | id=${scrapedTextId ?? 'unknown'}`,
      err instanceof Error ? err.message : 'unknown'
    )
    return {
      processedText: '[CONTEUDO_REMOVIDO]',
      piiCategories: ['FALLBACK_APPLIED'],
    }
  }
}

function processText(text: string): AnonymizationResult {
  let processedText = text
  const piiCategories: string[] = []

  // Substituição em ordem para evitar conflitos entre regex
  for (const { name, regex, placeholder } of PII_REPLACEMENTS) {
    regex.lastIndex = 0
    const before = processedText
    processedText = processedText.replace(regex, placeholder)
    if (processedText !== before) {
      piiCategories.push(name)
    }
  }

  return { processedText, piiCategories }
}

function processInChunks(text: string, scrapedTextId?: string): AnonymizationResult {
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    chunks.push(text.slice(i, i + CHUNK_SIZE))
  }

  const allCategories = new Set<string>()
  const processedChunks: string[] = []

  for (const chunk of chunks) {
    const { processedText, piiCategories } = processText(chunk)
    processedChunks.push(processedText)
    piiCategories.forEach((c) => allCategories.add(c))
  }

  return {
    processedText: processedChunks.join(''),
    piiCategories: Array.from(allCategories),
  }
}
