// POST /api/v1/settings/api-keys/[provider]/test — testa credencial salva (TASK-8 ST002 / CL-248)

import { NextRequest, NextResponse } from 'next/server'
import { requireSession, internalError } from '@/lib/api-auth'
import {
  testCredential,
  recordTestResult,
} from '@/lib/services/credential-tester.service'

const SUPPORTED = ['openai', 'anthropic', 'instagram', 'ga4', 'ideogram', 'flux', 'browserless'] as const

type Params = { params: Promise<{ provider: string }> }

export async function POST(_request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response

  const { provider } = await params
  if (!SUPPORTED.includes(provider as (typeof SUPPORTED)[number])) {
    return NextResponse.json(
      { success: false, code: 'PROVIDER_UNKNOWN', message: `Provider "${provider}" nao suportado.` },
      { status: 400 },
    )
  }

  try {
    const result = await testCredential(provider as (typeof SUPPORTED)[number])
    await recordTestResult(provider as (typeof SUPPORTED)[number], result, user!.id)

    return NextResponse.json({
      success: true,
      ok: result.ok,
      message: result.message,
      status: result.status,
      expiresAt: result.expiresAt ?? null,
      probeDetails: result.probeDetails ?? null,
      testedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[api-keys/test] erro:', err instanceof Error ? err.message : err)
    return internalError()
  }
}
