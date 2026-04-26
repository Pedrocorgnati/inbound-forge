// Intake Review TASK-6 ST001/ST003 (CL-276) — helpers compartilhados da UX
// de sessao expirada. Centraliza:
//  - `SESSION_EXPIRED_EVENT` (re-export do hook existente).
//  - `sanitizeRedirect(url)` — evita open redirect (so aceita caminhos relativos
//    same-origin, recusa `//`, `http(s)://...`, `javascript:`, etc.).
//  - `buildLoginUrl(locale, currentPath)` — monta `/login?redirect=...` com
//    encoding correto.
//  - `rememberCurrentPath()` — helper para salvar em sessionStorage a URL
//    corrente antes de redirecionar (fallback para middleware que nao conhece
//    o locale do contexto client).

export { SESSION_EXPIRED_EVENT } from '@/hooks/useSessionExpiration'

const REMEMBERED_PATH_KEY = 'session-expired:return-to'

/** Aceita apenas paths relativos ao mesmo origin (`/foo`, `/foo?x=1#y`). */
export function sanitizeRedirect(url: string | null | undefined): string | null {
  if (!url) return null
  const trimmed = String(url).trim()
  if (!trimmed) return null
  if (!trimmed.startsWith('/')) return null
  if (trimmed.startsWith('//')) return null
  if (/^\s*javascript:/i.test(trimmed)) return null
  // Evita retorno para a propria pagina de login.
  if (/^\/(pt-BR|en-US|it-IT|es-ES)?\/?login(\/|$|\?)/.test(trimmed)) return null
  return trimmed
}

export function buildLoginUrl(locale: string, currentPath: string | null | undefined): string {
  const safe = sanitizeRedirect(currentPath) ?? ''
  const base = `/${locale}/login`
  if (!safe) return base
  return `${base}?redirect=${encodeURIComponent(safe)}`
}

export function rememberCurrentPath(): void {
  if (typeof window === 'undefined') return
  try {
    const current = window.location.pathname + window.location.search + window.location.hash
    const safe = sanitizeRedirect(current)
    if (safe) window.sessionStorage.setItem(REMEMBERED_PATH_KEY, safe)
  } catch {
    // noop
  }
}

export function popRememberedPath(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const value = window.sessionStorage.getItem(REMEMBERED_PATH_KEY)
    if (value) window.sessionStorage.removeItem(REMEMBERED_PATH_KEY)
    return sanitizeRedirect(value)
  } catch {
    return null
  }
}
