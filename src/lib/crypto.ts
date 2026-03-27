/**
 * Módulo de criptografia PII — AES-256-GCM
 * COMP-002: contactInfo sempre criptografado antes de persistir
 * SEC-001: Chave nunca hardcoded — lida de PII_ENCRYPTION_KEY
 * SEC-008: Nunca logar plaintext
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16  // bytes
const AUTH_TAG_LENGTH = 16 // bytes
const KEY_LENGTH = 32 // bytes (256 bits)

function getKey(): Buffer {
  const keyHex = process.env.PII_ENCRYPTION_KEY
  if (!keyHex) {
    throw new Error('PII_ENCRYPTION_KEY is required')
  }
  const key = Buffer.from(keyHex, 'hex')
  if (key.length !== KEY_LENGTH) {
    throw new Error(`PII_ENCRYPTION_KEY must be ${KEY_LENGTH * 2} hex chars (${KEY_LENGTH} bytes)`)
  }
  return key
}

/**
 * Criptografa plaintext com AES-256-GCM.
 * Formato do output: base64(iv[16] + authTag[16] + ciphertext)
 */
export function encryptPII(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  // Layout: iv(16) + authTag(16) + ciphertext(N)
  return Buffer.concat([iv, authTag, encrypted]).toString('base64')
}

/**
 * Descriptografa valor previamente criptografado com encryptPII.
 * Lança erro se integridade GCM falhar.
 */
export function decryptPII(ciphertext: string): string {
  const key = getKey()
  const data = Buffer.from(ciphertext, 'base64')

  if (data.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Ciphertext inválido: muito curto')
  }

  const iv = data.subarray(0, IV_LENGTH)
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
  decipher.setAuthTag(authTag)

  try {
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
    return decrypted.toString('utf8')
  } catch {
    throw new Error('Falha na verificação de integridade GCM — dado adulterado')
  }
}

/**
 * Verifica se PII_ENCRYPTION_KEY está configurada no startup.
 * Chamar em src/lib/prisma.ts ou no app initialization.
 */
export function validatePIIKey(): void {
  getKey() // throws se ausente ou inválida
}
