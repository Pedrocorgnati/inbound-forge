// module-9: Supabase Storage Upload
// Rastreabilidade: TASK-3 ST004, INT-059, FEAT-creative-generation-004
//
// RESPONSABILIDADE: Upload + retorno de URL pública APENAS.
// Atualização de ContentPiece (CX-02) é responsabilidade de generate.ts.

import { createClient } from '@supabase/supabase-js'

let _supabase: ReturnType<typeof createClient> | null = null

function getSupabaseClient(env: { SUPABASE_URL: string; SUPABASE_SERVICE_ROLE_KEY: string }) {
  if (!_supabase) {
    _supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  }
  return _supabase
}

/**
 * Faz upload de um buffer para o Supabase Storage e retorna a URL pública.
 * NÃO acessa banco de dados. NÃO atualiza ContentPiece.
 */
export async function uploadImageToStorage(
  buffer: Buffer,
  jobId:  string,
  format: 'png' | 'webp' = 'webp',
  env:    { SUPABASE_URL: string; SUPABASE_SERVICE_ROLE_KEY: string; SUPABASE_STORAGE_BUCKET: string },
  signal?: AbortSignal
): Promise<string> {
  const supabase   = getSupabaseClient(env)
  const bucket     = env.SUPABASE_STORAGE_BUCKET
  const fileName   = `image-jobs/${jobId}.${format}`
  const contentType = format === 'webp' ? 'image/webp' : 'image/png'

  const uploadPromise = supabase.storage
    .from(bucket)
    .upload(fileName, buffer, { contentType, upsert: true })

  // Supabase JS v2 does not natively support AbortSignal — check before upload + Promise.race
  if (signal?.aborted) {
    const err = new Error('Upload aborted')
    err.name  = 'AbortError'
    throw err
  }

  let uploadResult: Awaited<typeof uploadPromise>

  if (signal) {
    const abortPromise = new Promise<never>((_, reject) => {
      signal.addEventListener('abort', () => {
        const err = new Error('Upload aborted')
        err.name  = 'AbortError'
        reject(err)
      }, { once: true })
    })
    uploadResult = await Promise.race([uploadPromise, abortPromise])
  } else {
    uploadResult = await uploadPromise
  }

  if (uploadResult.error) {
    const msg = uploadResult.error.message
    if (msg?.toLowerCase().includes('not found') || msg?.toLowerCase().includes('does not exist')) {
      throw new Error(`Storage bucket not found: ${bucket}`)
    }
    throw new Error(`Storage upload failed: ${msg}`)
  }

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName)

  return publicUrl
}
