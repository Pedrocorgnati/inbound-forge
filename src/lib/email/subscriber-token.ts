// Inbound F1 — tokens HMAC-SHA256 para confirm (double-opt-in) e unsubscribe.
// Espelha src/lib/seo/preview-token.ts. Confirm expira (48h); unsubscribe e PERMANENTE
// (RFC 8058 / boa pratica: link de descadastro nunca deve expirar).
import { createHmac, timingSafeEqual } from 'crypto'

const CONFIRM_TTL_MS = 48 * 60 * 60 * 1000

export type TokenPurpose = 'confirm' | 'unsubscribe'

function getSecret(): string {
  const s = process.env.CSRF_SECRET ?? process.env.BLOG_PREVIEW_SECRET
  if (!s || s.length < 16) {
    throw new Error('CSRF_SECRET nao configurado (min 16 chars) para tokens de email.')
  }
  return s
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url')
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url')
}

interface TokenPayload {
  sub: string // subscriberId
  p: TokenPurpose
  exp: number | null // null = permanente (unsubscribe)
}

export function mintSubscriberToken(
  subscriberId: string,
  purpose: TokenPurpose,
  now: number = Date.now(),
): string {
  const exp = purpose === 'confirm' ? now + CONFIRM_TTL_MS : null
  const payload = base64url(JSON.stringify({ sub: subscriberId, p: purpose, exp } satisfies TokenPayload))
  return `${payload}.${sign(payload)}`
}

export function verifySubscriberToken(
  token: string,
  expectedPurpose: TokenPurpose,
  now: number = Date.now(),
): { ok: true; subscriberId: string } | { ok: false; reason: string } {
  const parts = token.split('.')
  if (parts.length !== 2) return { ok: false, reason: 'malformed' }
  const [payloadB64, sig] = parts
  const expected = sign(payloadB64)
  const a = Buffer.from(sig, 'base64url')
  const b = Buffer.from(expected, 'base64url')
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: 'invalid_signature' }
  }
  let payload: TokenPayload
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString()) as TokenPayload
  } catch {
    return { ok: false, reason: 'invalid_payload' }
  }
  if (!payload.sub || payload.p !== expectedPurpose) return { ok: false, reason: 'purpose_mismatch' }
  if (payload.exp !== null && now > payload.exp) return { ok: false, reason: 'expired' }
  return { ok: true, subscriberId: payload.sub }
}
