/**
 * TASK-6 (CL-190) — Regenera tema com quota enforcement.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/api-auth'
import {
  assertCanRegenerate,
  incrementRegenerationCount,
  regenerationHeaders,
  RegenerationQuotaError,
  REGEN_HARD_CAP,
} from '@/lib/services/regeneration-quota.service'

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { id } = await params

  try {
    const theme = await prisma.theme.findUnique({ where: { id } })
    if (!theme) {
      return NextResponse.json({ success: false, error: 'Theme nao encontrado' }, { status: 404 })
    }

    const currentCount = await assertCanRegenerate(id)

    const newCount = await incrementRegenerationCount(id)

    // Telemetria CL-190: regeneration_confirmed_count
    console.info(
      `[regen] theme=${id} count=${newCount}/${REGEN_HARD_CAP} confirmed=true prev=${currentCount}`
    )

    return NextResponse.json(
      { success: true, data: { themeId: id, regenerationCount: newCount } },
      { status: 200, headers: regenerationHeaders(newCount) }
    )
  } catch (err) {
    if (err instanceof RegenerationQuotaError) {
      console.warn(`[regen] blocked theme=${id} count=${err.count}/${err.cap}`)
      return NextResponse.json(
        { success: false, error: { code: err.code, message: err.message } },
        { status: 429, headers: regenerationHeaders(err.count) }
      )
    }
    console.error('[POST /themes/:id/regenerate]', err)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response
  const { id } = await params
  const theme = await prisma.theme.findUnique({
    where: { id },
    select: { regenerationCount: true },
  })
  if (!theme) {
    return NextResponse.json({ success: false, error: 'Theme nao encontrado' }, { status: 404 })
  }
  return NextResponse.json(
    { success: true, data: { regenerationCount: theme.regenerationCount, cap: REGEN_HARD_CAP } },
    { headers: regenerationHeaders(theme.regenerationCount) }
  )
}
