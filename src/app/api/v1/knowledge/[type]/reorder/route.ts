// POST /api/v1/knowledge/[type]/reorder — persiste ordem (TASK-13 ST001 / CL-039)

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSession, validationError, internalError, notFound } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

const Schema = z.object({
  items: z
    .array(z.object({ id: z.string().min(1), order: z.number().int().min(0) }))
    .min(1)
    .max(200),
})

const TYPE_TO_DELEGATE = {
  cases: 'caseLibraryEntry',
  pains: 'painLibraryEntry',
  patterns: 'solutionPattern',
  objections: 'objection',
} as const

type Params = { params: Promise<{ type: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response
  const { type } = await params
  const delegateName = TYPE_TO_DELEGATE[type as keyof typeof TYPE_TO_DELEGATE]
  if (!delegateName) return notFound('Tipo invalido')

  const body = await request.json().catch(() => null)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const delegate = (prisma as unknown as Record<string, { update: (args: unknown) => Promise<unknown> }>)[
      delegateName
    ]
    await prisma.$transaction(
      parsed.data.items.map((it) =>
        delegate.update({ where: { id: it.id }, data: { sortOrder: it.order } }),
      ) as never,
    )
    return NextResponse.json({ success: true, count: parsed.data.items.length })
  } catch {
    return internalError()
  }
}
