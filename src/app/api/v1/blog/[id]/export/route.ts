/**
 * TASK-13 (CL-121) — Stub de export MDX (roadmap pos-MVP).
 */
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: 'not_implemented',
      message: 'Export MDX ainda nao implementado — roadmap pos-MVP',
      roadmap: 'docs/ROADMAP.md#post-mvp',
    },
    { status: 501 }
  )
}
