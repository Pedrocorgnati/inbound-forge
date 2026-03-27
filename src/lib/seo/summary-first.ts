// Module-11: Summary-First Architecture
// Rastreabilidade: TASK-3 ST003, INT-101, FEAT-publishing-blog-004
// Error Catalog: VAL_020

import { MAX_META_DESCRIPTION_LENGTH } from '@/lib/constants/blog'

export interface ExcerptValidationResult {
  valid: boolean
  error?: string
  warning?: string
}

/**
 * Valida que o excerpt segue a arquitetura summary-first.
 * Regra: excerpt obrigatório, warning se > MAX_META_DESCRIPTION_LENGTH (VAL_020).
 */
export function validateExcerpt(excerpt: string | undefined | null): ExcerptValidationResult {
  if (!excerpt || excerpt.trim().length === 0) {
    return {
      valid: false,
      error: 'Excerpt obrigatório para arquitetura summary-first (INT-101)',
    }
  }

  if (excerpt.length > MAX_META_DESCRIPTION_LENGTH) {
    return {
      valid: true, // Não bloqueia — apenas avisa
      warning: `Excerpt excede ${MAX_META_DESCRIPTION_LENGTH} chars (meta description será truncada) — VAL_020`,
    }
  }

  return { valid: true }
}

/**
 * Retorna excerpt efetivo para meta description.
 * Trunca se necessário (VAL_020).
 */
export function getEffectiveExcerpt(excerpt: string, maxLength = MAX_META_DESCRIPTION_LENGTH): string {
  if (excerpt.length <= maxLength) return excerpt
  return excerpt.slice(0, maxLength - 3) + '...'
}
