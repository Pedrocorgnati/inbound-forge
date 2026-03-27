import { NextResponse } from 'next/server'
import { extractBearerToken, verifyWorkerToken } from '@/lib/auth/worker-token'

// POST /api/auth/worker-token
// Valida Bearer token de workers Railway (SEC-005: timingSafeEqual)
// Usado pelos workers de scraping, image e publishing para autenticar
export async function POST(req: Request) {
  const token = extractBearerToken(req.headers.get('Authorization'))

  if (!token || !verifyWorkerToken(token)) {
    // SEC-008: sem detalhes no erro — não revelar se token existe ou é inválido
    return NextResponse.json(
      { success: false, error: { code: 'AUTH_004', message: 'Token inválido' } },
      { status: 401 }
    )
  }

  return NextResponse.json({ success: true, data: { valid: true } })
}
