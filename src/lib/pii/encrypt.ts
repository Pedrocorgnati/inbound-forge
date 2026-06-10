import 'server-only'

import { encryptPII, decryptPII } from '@/lib/crypto'

export type EncryptedPIIPayload = string

export function encryptPayload(payload: unknown): EncryptedPIIPayload {
  return encryptPII(JSON.stringify(payload))
}

export function decryptPayload<T = unknown>(ciphertext: EncryptedPIIPayload): T {
  return JSON.parse(decryptPII(ciphertext)) as T
}

