// Inbound F2 — config publica de render do form (sem PII). So forms PUBLISHED.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Params = { params: Promise<{ slug: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const { slug } = await params
  const form = await prisma.leadForm.findUnique({
    where: { slug },
    select: { slug: true, name: true, kind: true, status: true, headline: true, description: true, ctaLabel: true, lgpdConsentText: true },
  })
  if (!form || form.status !== 'PUBLISHED') {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }
  return NextResponse.json({ form })
}
