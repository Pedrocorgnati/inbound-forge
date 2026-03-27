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
