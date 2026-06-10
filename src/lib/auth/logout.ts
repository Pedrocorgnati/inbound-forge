/**
 * Rastreabilidade: CL-261, TASK-8 ST004
 * Logout completo: Supabase signOut + cookies legacy + AuditLog.
 * Chamado pelo servidor (API route) e pelo cliente (useAuth).
 * Nota: clearAuthCookies/clearStorageArtifacts têm guards typeof window — seguro importar no servidor.
 */
import { auditLog, AUDIT_ACTIONS } from '@/lib/audit'

const LEGACY_COOKIE_PREFIXES = ['sb-', 'inbound-', 'next-auth.']
const LS_APP_PREFIX = 'inbound-forge:'
const SUPABASE_IDB_KEY = 'supabase-auth-token'

/**
 * Limpa todos os cookies do domínio que começam com prefixos conhecidos.
 * Rodado no cliente após signOut bem-sucedido.
 */
export function clearAuthCookies(): void {
  if (typeof document === 'undefined') return
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const name = cookie.split('=')[0].trim()
    if (LEGACY_COOKIE_PREFIXES.some((p) => name.startsWith(p))) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`
    }
  }
}

/**
 * Limpa IndexedDB do Supabase e localStorage com prefixo do app.
 */
export async function clearStorageArtifacts(): Promise<void> {
  if (typeof window === 'undefined') return

  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(LS_APP_PREFIX) || key === SUPABASE_IDB_KEY) {
      localStorage.removeItem(key)
    }
  }

  try {
    const dbs = await indexedDB.databases?.()
    if (dbs) {
      for (const db of dbs) {
        if (db.name?.includes('supabase')) indexedDB.deleteDatabase(db.name)
      }
    }
  } catch {
    // indexedDB.databases() não disponível em todos os browsers — ignorar
  }
}

/**
 * Registra logout no AuditLog (server-side).
 */
export async function auditLogout(userId: string): Promise<void> {
  await auditLog({
    action: AUDIT_ACTIONS.USER_LOGOUT,
    entityType: 'User',
    entityId: userId,
    userId,
  })
}
