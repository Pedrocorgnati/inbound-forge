export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions, locale = 'pt-BR'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  }).format(d)
}

export function formatDateRelative(date: Date, locale = 'pt-BR'): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)

  if (Math.abs(diffSec) < 60) return 'agora'
  const diffMin = Math.floor(diffSec / 60)
  if (Math.abs(diffMin) < 60) return `há ${diffMin} min`
  const diffHrs = Math.floor(diffMin / 60)
  if (Math.abs(diffHrs) < 24) return `há ${diffHrs}h`
  const diffDays = Math.floor(diffHrs / 24)
  if (Math.abs(diffDays) < 7) return `há ${diffDays}d`
  return formatDate(date, undefined, locale)
}

export function formatDateTime(date: Date | string, locale = 'pt-BR'): string {
  return formatDate(date, { hour: '2-digit', minute: '2-digit' }, locale)
}
