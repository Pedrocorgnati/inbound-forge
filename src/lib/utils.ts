// Re-export do modulo de utils
export { cn } from './utils/cn'
export { formatDate, formatDateRelative, formatDateTime } from './utils/date'
export { formatCurrency } from './utils/currency'
export { generateSlug } from './utils/slug'
export { buildUTMUrl } from './utils/utm'
export { encryptPII, decryptPII, maskPII } from './utils/pii'
export { validateEnv } from './utils/env'

// Compat alias — consumidores antigos usam formatRelativeTime
export { formatDateRelative as formatRelativeTime } from './utils/date'

// Funcoes que existem apenas aqui (mover para utils/ depois)
export function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  const words = name.trim().split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}
