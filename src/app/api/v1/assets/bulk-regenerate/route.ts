// POST /api/v1/assets/bulk-regenerate (TASK-13 ST003 / CL-229)

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { requireSession, validationError, internalError } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { auditLog } from '@/lib/audit'

const Schema = z.object({
  assetIds: z.array(z.string().min(1)).min(1).max(20),
  options: z
    .object({
      provider: z.string().optional(),
      templateId: z.string().optional(),
    })
    .optional(),
})

export async function POST(request: NextRequest) {
  const { user, response } = await requireSession()
  if (response) return response

  const body = await request.json().catch(() => null)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  const correlationId = randomUUID()
  try {
    const created = await prisma.$transaction(
      parsed.data.assetIds.map((assetId) =>
        prisma.imageJob.create({
          data: {
            contentPieceId: assetId,
            templateId: parsed.data.options?.templateId,
            provider: parsed.data.options?.provider,
            status: 'PENDING',
            metadata: { correlationId, requestedBy: user!.id, mode: 'bulk-regenerate' },
          },
          select: { id: true },
        }),
      ),
    )

    await auditLog({
      action: 'ASSET_BULK_REGENERATE',
      entityType: 'ImageJob',
      entityId: correlationId,
      userId: user!.id,
      metadata: { count: created.length, assetIds: parsed.data.assetIds },
    }).catch(() => undefined)

    return NextResponse.json({
      success: true,
      correlationId,
      jobIds: created.map((c) => c.id),
    })
  } catch {
    return internalError()
  }
}
