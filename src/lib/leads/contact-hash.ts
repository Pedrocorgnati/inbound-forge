/**
 * TASK-3 ST001 (CL-TA-042): hash deterministico para deduplicar Lead por contactInfo.
 *
 * Normaliza email (lowercase+trim) e phone (apenas digitos, E.164 best-effort) e
 * produz SHA-256 hex. Inputs vazios ainda geram hash — evita colisao trivial em
 * all-null usando sentinel constante.
 */
import { createHash } from 'crypto'

export interface ContactInput {
  email?: string | null
  phone?: string | null
}

const EMPTY_SENTINEL = '__empty__'

export function normalizeEmail(email?: string | null): string {
  if (!email) return ''
  return email.trim().toLowerCase()
}

export function normalizePhone(phone?: string | null): string {
  if (!phone) return ''
  // Preserve leading + only if present, keep apenas digitos
  const digits = phone.replace(/\D/g, '')
  return digits
}

export function hashContactInfo(input: ContactInput): string {
  const email = normalizeEmail(input.email)
  const phone = normalizePhone(input.phone)
  const base = email || phone ? `${email}|${phone}` : EMPTY_SENTINEL
  return createHash('sha256').update(base).digest('hex')
}

/**
 * Extrai email/phone de contactInfo em texto livre (best-effort).
 * Usado em fluxos onde o Lead grava contactInfo como string agregada.
 */
export function parseContactInfo(contactInfo?: string | null): ContactInput {
  if (!contactInfo) return {}
  const emailMatch = contactInfo.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)
  const phoneMatch = contactInfo.match(/\+?\d[\d\s().-]{6,}/)
  return {
    email: emailMatch?.[0] ?? null,
    phone: phoneMatch?.[0] ?? null,
  }
}
