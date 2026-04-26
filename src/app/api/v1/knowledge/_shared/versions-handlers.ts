import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { listVersions, restoreVersion, type KbEntryType } from '@/lib/knowledge/versioning.service'

export async function handleListVersions(
  type: KbEntryType,
  params: Promise<{ id: string }>
): Promise<Response> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ code: 'SESSION_REQUIRED' }, { status: 401 })

  const { id } = await params
  const versions = await listVersions(type, id)
  return NextResponse.json({ versions })
}

export async function handleRestore(
  type: KbEntryType,
  params: Promise<{ id: string; versionId: string }>
): Promise<Response> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ code: 'SESSION_REQUIRED' }, { status: 401 })

  const { id, versionId } = await params
  const result = await restoreVersion({ type, entryId: id, versionId, restoredBy: user.id })
  if (!result) return NextResponse.json({ code: 'ERR-020', message: 'Versao nao encontrada' }, { status: 404 })
  return NextResponse.json({ restoredAsVersion: result.version })
}
