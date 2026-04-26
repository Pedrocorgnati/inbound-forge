/**
 * Cal.com webhook signature validator — Intake Review TASK-1 (CL-106)
 *
 * Cal.com assina cada entrega com HMAC-SHA256 do body bruto, enviando o hex
 * digest no header `x-cal-signature-256`. A comparacao usa `timingSafeEqual`
 * para evitar timing attacks.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

export function signPayload(rawBody: string, secret: string): string {
  return createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')
}

export function validateSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string
): boolean {
  if (!signatureHeader || !secret) return false

  const expected = signPayload(rawBody, secret)
  const expectedBuf = Buffer.from(expected, 'hex')
  let receivedBuf: Buffer
  try {
    receivedBuf = Buffer.from(signatureHeader.trim(), 'hex')
  } catch {
    return false
  }

  if (expectedBuf.length !== receivedBuf.length) return false
  return timingSafeEqual(expectedBuf, receivedBuf)
}
