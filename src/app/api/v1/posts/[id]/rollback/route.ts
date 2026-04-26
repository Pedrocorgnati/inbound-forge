import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase-server'
import { InstagramService } from '@/lib/services/instagram.service'
import { auditLog } from '@/lib/audit'
import { ContentStatus } from '@/types/enums'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  reason: z.string().min(10, 'Motivo deve ter no minimo 10 caracteres').max(500),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ code: 'SESSION_REQUIRED' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => null)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'ERR-001', message: 'Body invalido', issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const post = await prisma.post.findUnique({ where: { id } })
  if (!post) return NextResponse.json({ code: 'ERR-020', message: 'Post nao encontrado' }, { status: 404 })

  if (post.status !== ContentStatus.PUBLISHED) {
    return NextResponse.json(
      { code: 'ERR-022', message: 'Apenas posts PUBLISHED podem ser revertidos' },
      { status: 409 }
    )
  }

  let graphResult: { ok: boolean; graphStatus?: number; reason?: string } = { ok: false, reason: 'no_media_id' }
  if (post.platform === 'instagram_graph_api' && post.platformPostId) {
    graphResult = await InstagramService.deleteMedia(post.platformPostId)
  }

  await prisma.post.update({
    where: { id },
    data: {
      status: ContentStatus.ROLLED_BACK,
      rolledBackAt: new Date(),
      rollbackReason: parsed.data.reason,
      rollbackByOperatorId: user.id,
    },
  })

  await auditLog({
    action: 'POST_ROLLBACK',
    entityType: 'Post',
    entityId: id,
    userId: user.id,
    metadata: {
      reason: parsed.data.reason,
      graphResult,
      previousStatus: ContentStatus.PUBLISHED,
    },
  }).catch(() => undefined)

  return NextResponse.json({
    ok: true,
    graphDeleted: graphResult.ok,
    fallbackLocalOnly: !graphResult.ok,
    graphReason: graphResult.reason,
  })
}
