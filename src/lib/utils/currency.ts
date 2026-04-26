const CURRENCY_LOCALE: Record<string, string> = {
  BRL: 'pt-BR',
  USD: 'en-US',
  EUR: 'de-DE',
}

export function formatCurrency(
  amount: number,
  currency: 'BRL' | 'USD' | 'EUR' = 'BRL',
  locale?: string
): string {
  const resolvedLocale = locale ?? CURRENCY_LOCALE[currency] ?? 'pt-BR'
  return new Intl.NumberFormat(resolvedLocale, {
    style: 'currency',
    currency,
  }).format(amount)
}

/**
 * formatBRL — TASK-14 ST001 (CL-210)
 *
 * Helper canonico para moeda BRL (pt-BR). Equivale a `formatCurrency(v, 'BRL', 'pt-BR')`
 * mas documenta explicitamente a intencao "valor monetario em reais para o operador".
 * Use SEMPRE este helper em telas de custo/financeiro ligadas ao mercado-alvo brasileiro.
 * Valores tecnicos em USD (APIs internacionais) devem continuar usando `formatCurrency(v, 'USD')`.
 *
 * Exemplo: `formatBRL(1234.5) // "R$ 1.234,50"`
 */
export function formatBRL(amount: number): string {
  return formatCurrency(amount, 'BRL', 'pt-BR')
}
