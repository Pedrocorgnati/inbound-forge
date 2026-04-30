/**
 * Intake-Review TASK-2 ST004 (CL-CG-012): dialog de upload com dropzone,
 * preview local, barra de progresso e feedback explicit (toast).
 *
 * Respeita Zero Silencio (toast em sucesso/erro), Zero Estados Indefinidos
 * (loading/empty/success/error todos renderizados).
 */
'use client'
import { useCallback, useRef, useState } from 'react'
import { useAssetUpload, type AssetUploadResult } from '@/hooks/useAssetUpload'

export interface AssetUploadDialogProps {
  open: boolean
  onClose: () => void
  onUploaded?: (result: AssetUploadResult) => void
  /** Callback chamado apos sucesso para invalidacao de cache de galeria. */
  onInvalidate?: () => void
}

const ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml'
const MAX_MB = 10

export function AssetUploadDialog(props: AssetUploadDialogProps) {
  const { open, onClose, onUploaded, onInvalidate } = props
  const [dragOver, setDragOver] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const { upload, cancel, reset, progress, isUploading, error } = useAssetUpload({
    onSuccess: (result) => {
      onUploaded?.(result)
      onInvalidate?.()
      // deferred close para operador ver o 100% e toast
      setTimeout(() => {
        handleClose()
      }, 600)
    },
  })

  const handleFile = useCallback((file: File) => {
    if (file.size > MAX_MB * 1024 * 1024) {
      alert(`Arquivo excede ${MAX_MB} MB`)
      return
    }
    setSelectedFile(file)
    setPreview(URL.createObjectURL(file))
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleClose = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setSelectedFile(null)
    reset()
    onClose()
  }, [preview, reset, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="asset-upload-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-center justify-between">
          <h2 id="asset-upload-title" className="text-lg font-semibold">
            Upload de Asset
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fechar"
            className="text-gray-500 hover:text-gray-700"
          >
            &times;
          </button>
        </header>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={[
            'flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed p-4',
            dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300',
          ].join(' ')}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Preview"
              className="max-h-40 object-contain"
            />
          ) : (
            <>
              <p className="text-sm text-gray-600">
                Arraste uma imagem ou clique para selecionar
              </p>
              <p className="mt-1 text-xs text-gray-400">
                PNG, JPEG, WEBP, SVG • max {MAX_MB} MB
              </p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
            }}
          />
        </div>

        {isUploading && (
          <div className="mt-4">
            <div className="h-2 w-full rounded bg-gray-200">
              <div
                className="h-2 rounded bg-blue-600 transition-all"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">Enviando... {progress}%</p>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error.message}
          </p>
        )}

        <footer className="mt-5 flex justify-end gap-2">
          {isUploading ? (
            <button
              type="button"
              onClick={cancel}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm"
            >
              Cancelar
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm"
              >
                Fechar
              </button>
              <button
                type="button"
                disabled={!selectedFile}
                onClick={() => selectedFile && upload(selectedFile)}
                className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
              >
                Enviar
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  )
}
