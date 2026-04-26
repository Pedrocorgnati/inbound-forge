// preview-token — HMAC-SHA256 token para preview de artigos nao publicados
// TASK-9 ST002 / CL-237. Equivalente a JWT HS256 minimalista (sem dependencia extra).

import { createHmac, timingSafeEqual } from 'crypto'

const TTL_MS = 15 * 60 * 1000

function getSecret(): string {
  const s = process.env.BLOG_PREVIEW_SECRET ?? process.env.CSRF_SECRET
  if (!s || s.length < 16) {
    throw new Error('BLOG_PREVIEW_SECRET nao configurado (min 16 chars).')
  }
  return s
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url')
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url')
}

export function mintPreviewToken(articleId: string, now: number = Date.now()): string {
  const exp = now + TTL_MS
  const payload = base64url(JSON.stringify({ articleId, exp }))
  const sig = sign(payload)
  return `${payload}.${sig}`
}

export interface PreviewPayload {
  articleId: string
  exp: number
}

export function verifyPreviewToken(
  token: string,
  now: number = Date.now(),
): { ok: true; payload: PreviewPayload } | { ok: false; reason: string } {
  const parts = token.split('.')
  if (parts.length !== 2) return { ok: false, reason: 'malformed' }
  const [payloadB64, sig] = parts
  const expected = sign(payloadB64)
  const a = Buffer.from(sig, 'base64url')
  const b = Buffer.from(expected, 'base64url')
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: 'invalid_signature' }
  }
  let payload: PreviewPayload
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString()) as PreviewPayload
  } catch {
    return { ok: false, reason: 'invalid_payload' }
  }
  if (!payload.articleId || typeof payload.exp !== 'number') {
    return { ok: false, reason: 'invalid_payload' }
  }
  if (now > payload.exp) return { ok: false, reason: 'expired' }
  return { ok: true, payload }
}
