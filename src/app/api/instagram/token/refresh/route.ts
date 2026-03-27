/**
 * POST /api/instagram/token/refresh — Força refresh do access token
 * Normalmente feito automaticamente, mas disponível manualmente.
 * module-12-calendar-publishing | INT-118
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSession, ok, internalError } from '@/lib/api-auth'
import { getTokenStatus } from '@/lib/instagram/token-manager'
import { getInstagramConfig } from '@/lib/instagram-client'
import { createInstagramClient } from '@/lib/instagram/instagram-client'

export async function POST(_request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  try {
    const config = getInstagramConfig()
    if (!config) {
      return NextResponse.json(
        { success: false, error: 'Instagram não configurado' },
        { status: 400 }
      )
    }

    const client = createInstagramClient(config.userAccessToken, config.businessAccountId)
    const { expiresAt } = await client.refreshToken()

    const tokenStatus = await getTokenStatus()
    return ok({ newTokenExpiry: expiresAt, tokenStatus })
  } catch {
    return internalError()
  }
}
