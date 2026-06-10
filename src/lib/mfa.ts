import 'server-only'
import crypto from 'crypto'

/**
 * loop 05-27 TAREFA-028 (P3): helpers de MFA/TOTP opt-in.
 *
 * Decisao de arquitetura (Zero Assumido): este projeto autentica via Supabase
 * Auth (auth.users), nao ha modelo Prisma `User`. Por isso o segredo TOTP NAO e
 * persistido localmente — quem enrola, desafia, verifica e guarda o segredo
 * (criptografado em repouso) e o proprio Supabase, via `supabase.auth.mfa.*`.
 * O unico estado local e o conjunto de backup codes (recovery), guardado apenas
 * como hash SHA-256 na tabela `mfa_backup_codes`. Nunca persistimos o segredo
 * TOTP nem os backup codes em texto plano.
 */

export const BACKUP_CODE_COUNT = 10
/** Numero de bytes aleatorios por codigo antes da formatacao (alfabeto base32). */
const BACKUP_CODE_BYTES = 5
/** Alfabeto Crockford-like sem caracteres ambiguos (0/O, 1/I/L). */
const BACKUP_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/** Nome amigavel do fator TOTP enrolado por este fluxo. */
export const TOTP_FRIENDLY_NAME = 'inbound-forge-totp'

/**
 * Gera `BACKUP_CODE_COUNT` backup codes unicos no formato `XXXX-XXXX`.
 * Usa CSPRNG (crypto.randomInt) e rejeita colisoes para garantir unicidade.
 */
export function generateBackupCodes(): string[] {
  const codes = new Set<string>()
  while (codes.size < BACKUP_CODE_COUNT) {
    let raw = ''
    for (let i = 0; i < BACKUP_CODE_BYTES * 2; i++) {
      raw += BACKUP_CODE_ALPHABET[crypto.randomInt(0, BACKUP_CODE_ALPHABET.length)]
    }
    codes.add(`${raw.slice(0, 5)}-${raw.slice(5, 10)}`)
  }
  return Array.from(codes)
}

/**
 * Normaliza um backup code informado pelo usuario: maiusculas, sem espacos,
 * hifen canonico no meio. Aceita com ou sem hifen.
 */
export function normalizeBackupCode(input: string): string {
  const compact = input.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (compact.length !== 10) return compact
  return `${compact.slice(0, 5)}-${compact.slice(5, 10)}`
}

/** Hash determinista (SHA-256 hex) de um backup code ja normalizado. */
export function hashBackupCode(code: string): string {
  return crypto.createHash('sha256').update(normalizeBackupCode(code)).digest('hex')
}

/**
 * Comparacao constante-time entre dois hashes hex de mesmo tamanho.
 * Evita timing attacks na verificacao de backup code.
 */
export function safeHashEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
  } catch {
    return false
  }
}
