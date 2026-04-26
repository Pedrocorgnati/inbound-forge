import { createHmac, timingSafeEqual } from 'crypto'

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000
const CSRF_COOKIE_NAME = 'x-csrf-token'

function getSecret(): string {
  const secret = process.env.CSRF_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('CSRF_SECRET env must be set and >= 32 chars')
  }
  return secret
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('hex')
}

export function generateCsrfToken(sessionId: string, now: number = Date.now()): string {
  const ts = now.toString()
  const payload = `${sessionId}.${ts}`
  const sig = sign(payload)
  return Buffer.from(`${payload}.${sig}`, 'utf8').toString('base64url')
}

export function verifyCsrfToken(token: string, sessionId: string, now: number = Date.now()): boolean {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8')
    const [sid, ts, sig] = decoded.split('.')
    if (!sid || !ts || !sig) return false
    if (sid !== sessionId) return false
    const age = now - Number(ts)
    if (!Number.isFinite(age) || age < 0 || age > TOKEN_TTL_MS) return false
    const expected = sign(`${sid}.${ts}`)
    const a = Buffer.from(sig, 'hex')
    const b = Buffer.from(expected, 'hex')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export { CSRF_COOKIE_NAME, TOKEN_TTL_MS }
