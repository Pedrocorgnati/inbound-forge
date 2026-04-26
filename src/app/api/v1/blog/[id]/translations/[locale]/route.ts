import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PatchSchema = z.object({
  status: z.enum(['DRAFT', 'APPROVED', 'REJECTED']),
  rejectionReason: z.string().max(500).optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; locale: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ code: 'SESSION_REQUIRED' }, { status: 401 })

  const { id, locale } = await params
  const body = await request.json().catch(() => null)
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ code: 'ERR-001', issues: parsed.error.issues }, { status: 400 })
  }

  const updated = await (prisma as unknown as {
    blogArticleTranslation: { update: (args: unknown) => Promise<unknown> }
  }).blogArticleTranslation.update({
    where: { articleId_locale: { articleId: id, locale } },
    data: {
      status: parsed.data.status,
      rejectionReason: parsed.data.rejectionReason,
      approvedAt: parsed.data.status === 'APPROVED' ? new Date() : null,
    },
  })
  return NextResponse.json({ translation: updated })
}
