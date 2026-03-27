/**
 * src/lib/log-sanitizer.ts
 * Rastreabilidade: INT-091, SEC-008, TASK-4/ST003
 * Sanitização de objetos de log para remover PII antes de logar/enviar
 *
 * REGRA SEC-008: contactInfo, email, phone e outros campos PII
 * NUNCA devem aparecer em plaintext em logs de produção.
 */

/** Campos que contêm PII e devem ser mascarados */
export const PII_FIELDS: ReadonlySet<string> = new Set([
  'contactInfo',
  'contact_info',
  'email',
  'phone',
  'phoneNumber',
  'phone_number',
  'password',
  'passwordHash',
  'password_hash',
  'apiKey',
  'api_key',
  'token',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'secret',
  'privateKey',
  'private_key',
  'ssn',
  'cpf',
  'cnpj',
  'creditCard',
  'credit_card',
  'cardNumber',
  'card_number',
  'cvv',
])

const REDACTED = '[REDACTED]'

/**
 * Sanitiza recursivamente um objeto removendo campos PII (SEC-008)
 * Funciona com objetos aninhados, arrays e valores primitivos.
 *
 * @example
 * sanitizeForLog({ id: '123', contactInfo: 'João Silva', status: 'ACTIVE' })
 * // → { id: '123', contactInfo: '[REDACTED]', status: 'ACTIVE' }
 */
export function sanitizeForLog(data: unknown): unknown {
  if (data === null || data === undefined) return data

  if (typeof data === 'string') {
    // Strings simples não são alteradas (sem contexto de campo)
    return data
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeForLog)
  }

  if (typeof data === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (PII_FIELDS.has(key)) {
        result[key] = REDACTED
      } else {
        result[key] = sanitizeForLog(value)
      }
    }
    return result
  }

  return data
}

/**
 * Versão para uso em console.error — serializa e sanitiza
 */
export function sanitizedLog(label: string, data: unknown): void {
  if (process.env.NODE_ENV === 'test') return
  console.log(`[${label}]`, JSON.stringify(sanitizeForLog(data)))
}

/**
 * Versão para uso em console.error — serializa e sanitiza
 */
export function sanitizedError(label: string, data: unknown): void {
  console.error(`[${label}]`, JSON.stringify(sanitizeForLog(data)))
}
