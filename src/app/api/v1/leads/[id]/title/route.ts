// GET /api/v1/leads/[id]/title — label minimal para breadcrumbs (TASK-10 ST001 / CL-198)

import { NextResponse } from 'next/server'
import { requireSession, notFound, internalError } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

export async function GET(_: Request, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response
  const { id } = await params
  try {
    const lead = await prisma.lead.findUnique({
      where: { id },
      select: { name: true, company: true },
    })
    if (!lead) return notFound('Lead nao encontrado')
    return NextResponse.json({ title: lead.name?.trim() || lead.company?.trim() || id })
  } catch {
    return internalError()
  }
}
