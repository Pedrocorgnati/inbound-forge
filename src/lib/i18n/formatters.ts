'use client'
// RESOLVED: G002 — Formatadores de data/moeda com locale dinâmico via next-intl
import { useLocale } from 'next-intl'
import { formatDate, formatDateTime, formatDateRelative } from '@/lib/utils/date'
import { formatCurrency } from '@/lib/utils/currency'

export function useFormatters() {
  const locale = useLocale()

  return {
    /** Data: dd/mm/yyyy por padrão, aceita Intl.DateTimeFormatOptions para personalização */
    date: (d: Date | string | null | undefined, opts?: Intl.DateTimeFormatOptions): string =>
      d ? formatDate(d, opts, locale) : '—',

    /** Data + hora */
    dateTime: (d: Date | string | null | undefined): string =>
      d ? formatDateTime(d, locale) : '—',

    /** Hora: HH:mm */
    time: (d: Date | string | null | undefined): string =>
      d ? formatDate(d, { hour: '2-digit', minute: '2-digit' }, locale) : '—',

    /** Tempo relativo: "há 5 minutos", "5 minutes ago", etc. */
    relative: (d: Date): string => formatDateRelative(d, locale),

    /** Número com separadores localizados */
    number: (n: number): string => n.toLocaleString(locale),

    /** Moeda com símbolo localizado */
    currency: (amount: number, currency: 'BRL' | 'USD' | 'EUR' = 'BRL'): string =>
      formatCurrency(amount, currency, locale),
  }
}
