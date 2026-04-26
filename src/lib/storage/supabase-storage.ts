// TASK-4 ST001 (CL-256): abstracao de ops de storage no bucket "assets".
// Uso service-role key (server-only) para bypass de RLS em uploads controlados
// por handlers autenticados. Never import from client code.

import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'

const BUCKET = 'assets'

let cached: SupabaseClient | null = null

function getAdminClient(): SupabaseClient {
  if (cached) return cached
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes')
  }
  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return cached
}

export interface UploadResult {
  url: string
  path: string
  size: number
  contentHash: string
}

export function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

export async function uploadToBucket(
  buffer: Buffer,
  path: string,
  contentType: string
): Promise<UploadResult> {
  const client = getAdminClient()
  const { error } = await client.storage.from(BUCKET).upload(path, buffer, {
    contentType,
    upsert: true,
    cacheControl: '31536000',
  })
  if (error) throw error
  const { data } = client.storage.from(BUCKET).getPublicUrl(path)
  return {
    url: data.publicUrl,
    path,
    size: buffer.byteLength,
    contentHash: sha256(buffer),
  }
}

export async function deleteFromBucket(path: string): Promise<void> {
  const client = getAdminClient()
  const { error } = await client.storage.from(BUCKET).remove([path])
  if (error && !error.message.includes('not found')) throw error
}

export function getPublicUrl(path: string): string {
  const client = getAdminClient()
  return client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

export const ASSETS_BUCKET = BUCKET
