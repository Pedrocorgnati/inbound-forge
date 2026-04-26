// POST /api/v1/vitals — ingere metricas Web Vitals (TASK-14 ST004 / CL-278)

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const Schema = z.object({
  name: z.enum(['CLS', 'FCP', 'INP', 'LCP', 'TTFB']),
  value: z.number(),
  rating: z.enum(['good', 'needs-improvement', 'poor']),
  delta: z.number().optional(),
  id: z.string().optional(),
  navigationType: z.string().optional(),
  path: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const raw = await request.text()
    const body = raw ? JSON.parse(raw) : null
    const parsed = Schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 })

    // Log estruturado: coletores externos (Datadog/Sentry) absorvem via stdout
    console.info('[web-vitals]', JSON.stringify(parsed.data))
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}
