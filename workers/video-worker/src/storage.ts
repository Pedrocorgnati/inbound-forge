// Video Worker: Supabase Storage Upload

import { createClient } from '@supabase/supabase-js'

let _supabase: ReturnType<typeof createClient> | null = null

function getSupabaseClient(env: { SUPABASE_URL: string; SUPABASE_SERVICE_ROLE_KEY: string }) {
  if (!_supabase) {
    _supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  }
  return _supabase
}

/**
 * Faz upload de um buffer MP4 para o Supabase Storage e retorna a URL pública.
 */
export async function uploadVideoToStorage(
  buffer: Buffer,
  jobId:  string,
  env:    { SUPABASE_URL: string; SUPABASE_SERVICE_ROLE_KEY: string; SUPABASE_STORAGE_BUCKET: string },
  signal?: AbortSignal
): Promise<string> {
  const supabase   = getSupabaseClient(env)
  const bucket     = env.SUPABASE_STORAGE_BUCKET
  const fileName   = `video-jobs/${jobId}.mp4`
  const contentType = 'video/mp4'

  if (signal?.aborted) {
    const err = new Error('Upload aborted')
    err.name  = 'AbortError'
    throw err
  }

  const uploadPromise = supabase.storage
    .from(bucket)
    .upload(fileName, buffer, { contentType, upsert: true })

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
    throw new Error(`Storage upload failed: ${uploadResult.error.message}`)
  }

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName)

  return publicUrl
}
