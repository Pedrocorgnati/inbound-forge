import { timingSafeEqual } from 'crypto'

/**
 * Verifica se um Bearer token corresponde ao WORKER_AUTH_SECRET.
 * SEC-005: usa timingSafeEqual para prevenir timing attacks.
 */
export function verifyWorkerToken(token: string): boolean {
  const secret = process.env.WORKER_AUTH_SECRET
  if (!secret) {
    // SEC-008: nunca logar o valor do secret
    console.error('[Auth] WORKER_AUTH_SECRET não configurada — nenhum worker pode autenticar')
    return false
  }
  try {
    const tokenBuf = Buffer.from(token, 'utf8')
    const secretBuf = Buffer.from(secret, 'utf8')
    // SEC-005: buffers de tamanhos diferentes → always false (evita timing leak por length)
    if (tokenBuf.length !== secretBuf.length) return false
    return timingSafeEqual(tokenBuf, secretBuf)
  } catch {
    return false
  }
}

/**
 * Extrai o Bearer token do header Authorization.
 * Retorna null se o header estiver ausente ou malformado.
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  return token.length > 0 ? token : null
}

/**
 * Helper completo: extrai e verifica o Bearer token de uma Request.
 */
export function requireWorkerAuth(req: Request): boolean {
  const token = extractBearerToken(req.headers.get('Authorization'))
  return token !== null && verifyWorkerToken(token)
}
