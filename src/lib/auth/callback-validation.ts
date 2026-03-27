// SEC-003: Previne open redirect attacks validando que callbackUrl pertence ao mesmo domínio

const BLOCKED_PATHS = ['/login', '/logout', '/session-expired', '/api/auth']
const DEFAULT_URL = '/pt-BR/dashboard'

interface ValidationResult {
  valid: boolean
  sanitized: string
}

/**
 * Valida e sanitiza uma callbackUrl para prevenir open redirect (SEC-003).
 * - URLs externas → sanitizadas para /pt-BR/dashboard
 * - Paths de auth (login, logout) → sanitizados para /pt-BR/dashboard
 * - Paths internos válidos → retornados como estão
 */
export function validateCallbackUrl(url: string | null | undefined): ValidationResult {
  if (!url) return { valid: true, sanitized: DEFAULT_URL }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!appUrl) return { valid: true, sanitized: DEFAULT_URL }

    const parsed = new URL(url, appUrl)
    const allowed = new URL(appUrl)

    // Rejeitar URLs de origens diferentes
    if (parsed.origin !== allowed.origin) {
      return { valid: false, sanitized: DEFAULT_URL }
    }

    const pathname = parsed.pathname

    // Rejeitar paths de auth (previne loops de redirect)
    if (BLOCKED_PATHS.some((p) => pathname.startsWith(p))) {
      return { valid: false, sanitized: DEFAULT_URL }
    }

    return { valid: true, sanitized: pathname + (parsed.search ?? '') }
  } catch {
    return { valid: false, sanitized: DEFAULT_URL }
  }
}
