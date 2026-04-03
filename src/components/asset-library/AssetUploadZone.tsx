'use client'

import { useCallback, useRef, useState } from 'react'
import { Upload, CheckCircle2, AlertCircle, RotateCcw, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ASSET_UPLOAD_CONFIG, ASSET_ERROR_MESSAGES } from '@/lib/constants/asset-library'
import type { VisualAsset, UploadProgress } from '@/types/visual-asset'

interface AssetUploadZoneProps {
  onUploadComplete: (assets: VisualAsset[]) => void
}

type ZoneState = 'idle' | 'dragging' | 'uploading' | 'done' | 'error'

function _formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1_048_576).toFixed(1)} MB`
}

function validateFile(file: File): string | null {
  const { allowedTypes, maxFileSizeBytes } = ASSET_UPLOAD_CONFIG

  if (!allowedTypes.includes(file.type as typeof allowedTypes[number])) {
    return ASSET_ERROR_MESSAGES.VAL_002
  }

  if (file.size > maxFileSizeBytes) {
    const sizeMb = (file.size / 1_048_576).toFixed(1)
    return ASSET_ERROR_MESSAGES.VAL_003(file.name, sizeMb)
  }

  return null
}

async function uploadFile(
  file: File,
  onProgress: (progress: number) => void,
): Promise<VisualAsset> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('altText', file.name.replace(/\.[^.]+$/, ''))

  // Simulate progress since fetch doesn't support upload progress natively
  let currentProg = 0
  const progressInterval = setInterval(() => {
    currentProg = Math.min(currentProg + 10, 90)
    onProgress(currentProg)
  }, 200)

  try {
    const res = await fetch('/api/visual-assets', {
      method: 'POST',
      body: formData,
    })

    clearInterval(progressInterval)

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.message ?? ASSET_ERROR_MESSAGES.SYS_001)
    }

    onProgress(100)
    return await res.json()
  } catch (error) {
    clearInterval(progressInterval)
    throw error
  }
}

export function AssetUploadZone({ onUploadComplete }: AssetUploadZoneProps) {
  const [zoneState, setZoneState] = useState<ZoneState>('idle')
  const [uploads, setUploads] = useState<UploadProgress[]>([])
  const [failedFiles, setFailedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)

  const processFiles = useCallback(
    async (files: File[]) => {
      const batch = files.slice(0, ASSET_UPLOAD_CONFIG.maxFilesPerBatch)

      if (files.length > ASSET_UPLOAD_CONFIG.maxFilesPerBatch) {
        toast.error(`Máximo de ${ASSET_UPLOAD_CONFIG.maxFilesPerBatch} arquivos por vez. Apenas os primeiros ${ASSET_UPLOAD_CONFIG.maxFilesPerBatch} serão enviados.`)
      }

      // Client-side validation
      const validFiles: File[] = []
      const initialUploads: UploadProgress[] = []

      for (const file of batch) {
        const validationError = validateFile(file)
        if (validationError) {
          toast.error(`${file.name}: ${validationError}`)
          initialUploads.push({
            fileName: file.name,
            progress: 0,
            status: 'error',
            error: validationError,
          })
        } else {
          validFiles.push(file)
          initialUploads.push({
            fileName: file.name,
            progress: 0,
            status: 'uploading',
          })
        }
      }

      if (validFiles.length === 0) {
        setZoneState('error')
        setUploads(initialUploads)
        return
      }

      setZoneState('uploading')
      setUploads(initialUploads)
      setFailedFiles([])

      const results = await Promise.allSettled(
        validFiles.map(async (file) => {
          try {
            const asset = await uploadFile(file, (progress) => {
              setUploads((prev) =>
                prev.map((u) =>
                  u.fileName === file.name
                    ? { ...u, progress, status: 'uploading' as const }
                    : u,
                ),
              )
            })

            setUploads((prev) =>
              prev.map((u) =>
                u.fileName === file.name
                  ? { ...u, progress: 100, status: 'done' as const }
                  : u,
              ),
            )

            return { file, asset }
          } catch (err) {
            const message = err instanceof Error ? err.message : ASSET_ERROR_MESSAGES.SYS_001

            setUploads((prev) =>
              prev.map((u) =>
                u.fileName === file.name
                  ? { ...u, status: 'error' as const, error: message }
                  : u,
              ),
            )

            throw { file, message }
          }
        }),
      )

      const successful: VisualAsset[] = []
      const failed: File[] = []

      for (const result of results) {
        if (result.status === 'fulfilled') {
          successful.push(result.value.asset)
        } else {
          const reason = result.reason as { file: File; message: string }
          failed.push(reason.file)
          toast.error(`${reason.file.name}: ${reason.message}`)
        }
      }

      setFailedFiles(failed)

      if (successful.length > 0) {
        toast.success(`${successful.length} asset${successful.length > 1 ? 's' : ''} enviado${successful.length > 1 ? 's' : ''} com sucesso`)
        onUploadComplete(successful)
      }

      setZoneState(failed.length > 0 ? 'error' : 'done')

      // Reset to idle after 3 seconds if all succeeded
      if (failed.length === 0) {
        setTimeout(() => {
          setZoneState('idle')
          setUploads([])
        }, 3000)
      }
    },
    [onUploadComplete],
  )

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current += 1
    if (dragCounterRef.current === 1) {
      setZoneState('dragging')
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current -= 1
    if (dragCounterRef.current === 0) {
      setZoneState((prev) => (prev === 'dragging' ? 'idle' : prev))
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounterRef.current = 0

      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        processFiles(files)
      } else {
        setZoneState('idle')
      }
    },
    [processFiles],
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      if (files.length > 0) {
        processFiles(files)
      }
      // Reset input so the same file can be re-selected
      e.target.value = ''
    },
    [processFiles],
  )

  const handleRetry = useCallback(() => {
    if (failedFiles.length > 0) {
      processFiles(failedFiles)
    }
  }, [failedFiles, processFiles])

  const handleDismiss = useCallback(() => {
    setZoneState('idle')
    setUploads([])
    setFailedFiles([])
  }, [])

  return (
    <div
      role="region"
      aria-label="Área de upload de assets"
      aria-live="polite"
    >
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          'relative rounded-lg border-2 border-dashed p-6 transition-colors duration-200',
          'flex flex-col items-center justify-center gap-3 text-center',
          zoneState === 'idle' && 'border-border hover:border-muted-foreground/50 bg-background',
          zoneState === 'dragging' && 'border-primary bg-primary/5',
          zoneState === 'uploading' && 'border-border bg-background',
          zoneState === 'done' && 'border-success bg-success-bg/30',
          zoneState === 'error' && 'border-danger bg-danger-bg/30',
        )}
      >
        {zoneState === 'idle' && (
          <>
            <Upload className="h-8 w-8 text-muted-foreground" aria-hidden />
            <div>
              <p className="text-sm font-medium text-foreground">
                Arraste arquivos aqui ou
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG, WebP ou SVG — até 5MB por arquivo
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[44px]"
            >
              Selecionar arquivos
            </Button>
          </>
        )}

        {zoneState === 'dragging' && (
          <>
            <Upload className="h-8 w-8 text-primary animate-bounce" aria-hidden />
            <p className="text-sm font-medium text-primary">
              Solte aqui
            </p>
          </>
        )}

        {zoneState === 'done' && uploads.every((u) => u.status === 'done') && (
          <>
            <CheckCircle2 className="h-8 w-8 text-success" aria-hidden />
            <p className="text-sm font-medium text-foreground">
              Upload concluído
            </p>
          </>
        )}

        {(zoneState === 'uploading' || zoneState === 'error' || (zoneState === 'done' && uploads.some((u) => u.status !== 'done'))) && (
          <div className="w-full max-w-md space-y-2">
            {uploads.map((upload) => (
              <div key={upload.fileName} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-medium text-foreground truncate">
                      {upload.fileName}
                    </span>
                    {upload.status === 'done' && (
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0" aria-hidden />
                    )}
                    {upload.status === 'error' && (
                      <AlertCircle className="h-4 w-4 text-danger shrink-0" aria-hidden />
                    )}
                  </div>
                  {upload.status === 'uploading' && (
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${upload.progress}%` }}
                        role="progressbar"
                        aria-valuenow={upload.progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Enviando ${upload.fileName}`}
                      />
                    </div>
                  )}
                  {upload.status === 'error' && upload.error && (
                    <p className="text-xs text-danger mt-0.5">{upload.error}</p>
                  )}
                </div>
              </div>
            ))}

            {zoneState === 'error' && failedFiles.length > 0 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  className="min-h-[44px] gap-2"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden />
                  Tentar novamente
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="min-h-[44px] gap-2"
                >
                  <X className="h-4 w-4" aria-hidden />
                  Dispensar
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        multiple
        className="sr-only"
        onChange={handleFileChange}
        aria-label="Selecionar arquivos para upload"
        tabIndex={-1}
      />
    </div>
  )
}
