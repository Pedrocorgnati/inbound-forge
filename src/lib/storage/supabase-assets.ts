/**
 * Intake-Review TASK-2 ST001 (CL-CG-012): abstracao de upload para o bucket
 * 'visual-assets' com convencao de path per-user <uid>/<uuid>.<ext> que
 * casa com as RLS policies em storage.objects (ver storage-policies.sql).
 *
 * Distinto de src/lib/storage/supabase-storage.ts (bucket 'assets', outra
 * feature). Manter dois helpers separados garante que RLS policies
 * per-bucket nao sejam confundidas.
 */
import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

const BUCKET = 'visual-assets'

let cached: SupabaseClient | null = null

function getAdminClient(): SupabaseClient {
  if (cached) return cached
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes')
  }
  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return cached
}

export interface UploadAssetParams {
  buffer: Buffer
  mimeType: string
  userId: string
  filename: string
}

export interface UploadAssetResult {
  url: string
  path: string
  size: number
}

export async function uploadAsset(params: UploadAssetParams): Promise<UploadAssetResult> {
  const { buffer, mimeType, userId, filename } = params
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'bin'
  const path = `${userId}/${randomUUID()}.${ext}`

  const client = getAdminClient()
  const { error } = await client.storage.from(BUCKET).upload(path, buffer, {
    contentType: mimeType,
    upsert: false,
    cacheControl: '31536000',
  })
  if (error) throw error

  const { data } = client.storage.from(BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, path, size: buffer.byteLength }
}

export async function deleteAsset(path: string): Promise<void> {
  const client = getAdminClient()
  const { error } = await client.storage.from(BUCKET).remove([path])
  if (error && !error.message.includes('not found')) throw error
}

export async function uploadThumbnail(
  buffer: Buffer,
  userId: string,
  baseName: string,
): Promise<string> {
  const path = `${userId}/thumbnails/${baseName}.webp`
  const client = getAdminClient()
  const { error } = await client.storage.from(BUCKET).upload(path, buffer, {
    contentType: 'image/webp',
    upsert: true,
    cacheControl: '31536000',
  })
  if (error) throw error
  return client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

export const VISUAL_ASSETS_BUCKET = BUCKET
