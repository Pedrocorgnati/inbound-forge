/**
 * Intake-Review TASK-2 ST004 (CL-CG-012): hook para upload via XHR com
 * progresso granular. Usa XHR (nao fetch) porque fetch ainda nao expoe
 * progress events nativamente em todos os browsers alvo.
 */
'use client'
import { useCallback, useRef, useState } from 'react'

export interface AssetUploadResult {
  id: string
  url: string
  thumbnailUrl: string | null
  fileSize: number
}

export interface UseAssetUploadOptions {
  onSuccess?: (result: AssetUploadResult) => void
  onError?: (error: Error) => void
}

export function useAssetUpload(opts: UseAssetUploadOptions = {}) {
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const xhrRef = useRef<XMLHttpRequest | null>(null)

  const reset = useCallback(() => {
    setProgress(0)
    setError(null)
    setIsUploading(false)
  }, [])

  const upload = useCallback((file: File) => {
    setIsUploading(true)
    setError(null)
    setProgress(0)

    const xhr = new XMLHttpRequest()
    xhrRef.current = xhr
    const form = new FormData()
    form.append('file', file)

    return new Promise<AssetUploadResult>((resolve, reject) => {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100))
        }
      })

      xhr.addEventListener('load', () => {
        setIsUploading(false)
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const parsed = JSON.parse(xhr.responseText) as AssetUploadResult
            opts.onSuccess?.(parsed)
            resolve(parsed)
          } catch {
            const err = new Error('Resposta invalida do servidor')
            setError(err)
            opts.onError?.(err)
            reject(err)
          }
        } else {
          let message = `Falha no upload (HTTP ${xhr.status})`
          try {
            const body = JSON.parse(xhr.responseText) as { error?: string }
            if (body.error) message = body.error
          } catch { /* ignore */ }
          const err = new Error(message)
          setError(err)
          opts.onError?.(err)
          reject(err)
        }
      })

      xhr.addEventListener('error', () => {
        setIsUploading(false)
        const err = new Error('Erro de rede ao fazer upload')
        setError(err)
        opts.onError?.(err)
        reject(err)
      })

      xhr.addEventListener('abort', () => {
        setIsUploading(false)
        const err = new Error('Upload cancelado')
        setError(err)
        reject(err)
      })

      xhr.open('POST', '/api/v1/assets/upload', true)
      xhr.withCredentials = true
      xhr.send(form)
    })
  }, [opts])

  const cancel = useCallback(() => {
    xhrRef.current?.abort()
  }, [])

  return { upload, cancel, reset, progress, isUploading, error }
}
