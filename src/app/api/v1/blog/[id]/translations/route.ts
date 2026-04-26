import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ code: 'SESSION_REQUIRED' }, { status: 401 })

  const { id } = await params
  const translations = await (prisma as unknown as {
    blogArticleTranslation: { findMany: (args: unknown) => Promise<unknown[]> }
  }).blogArticleTranslation.findMany({
    where: { articleId: id },
    orderBy: { locale: 'asc' },
  })
  return NextResponse.json({ translations })
}
