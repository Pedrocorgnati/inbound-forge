/**
 * PII Check Utility
 * TASK-2 ST004 / module-6-scraping-worker
 *
 * Detecta PII básico (CPF, email, telefone BR) em strings de reasoning.
 * LGPD Art.10 + Art.46: verificação obrigatória antes de persistir reasoning da IA.
 * SEC-008: fail-safe — em caso de erro, substitui o valor inteiro.
 */

const PII_PATTERNS: { name: string; regex: RegExp }[] = [
  { name: 'CPF', regex: /\d{3}\.\d{3}\.\d{3}-\d{2}/ },
  { name: 'EMAIL', regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/ },
  { name: 'TELEFONE', regex: /\(\d{2}\)\s?\d{4,5}-?\d{4}/ },
  { name: 'CNPJ', regex: /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/ },
]

export interface PiiCheckResult {
  hasPii: boolean
  detectedTypes: string[]
}

/**
 * Verifica se uma string contém PII.
 * Retorna quais tipos foram detectados.
 */
export function checkPii(text: string | null | undefined): PiiCheckResult {
  if (!text) {
    return { hasPii: false, detectedTypes: [] }
  }

  const detectedTypes: string[] = []

  try {
    for (const { name, regex } of PII_PATTERNS) {
      if (regex.test(text)) {
        detectedTypes.push(name)
      }
    }
  } catch {
    // Em caso de erro no regex, assume PII presente (fail-safe)
    return { hasPii: true, detectedTypes: ['UNKNOWN'] }
  }

  return { hasPii: detectedTypes.length > 0, detectedTypes }
}

export const PII_REDACTED = '[REDACTED - PII detectado]'
export const PII_CHECK_FAILED = '[REDACTED - verificação falhou]'

/**
 * Sanitiza o campo reasoning antes de persistir.
 * Substitui o valor inteiro se PII for detectado (nunca substituição parcial).
 */
export function sanitizeReasoning(reasoning: string | null | undefined): string | null {
  if (!reasoning) return reasoning ?? null

  try {
    const { hasPii } = checkPii(reasoning)
    return hasPii ? PII_REDACTED : reasoning
  } catch {
    // Fail-safe: substitui para garantir que nenhum PII potencial seja gravado
    return PII_CHECK_FAILED
  }
}
