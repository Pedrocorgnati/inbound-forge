'use client'

import { useEffect, useState, useCallback } from 'react'
import { apiClient } from '@/lib/api-client'

type Version = {
  id: string
  version: number
  createdAt: string
  createdBy: string | null
  changeSummary: string | null
  snapshot: Record<string, unknown>
}

type KbType = 'cases' | 'pains' | 'patterns' | 'objections'

export function VersionHistory({ type, entryId }: { type: KbType; entryId: string }) {
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [confirmVersion, setConfirmVersion] = useState<Version | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiClient(`/api/v1/knowledge/${type}/${entryId}/versions`)
      if (res.ok) {
        const data = (await res.json()) as { versions: Version[] }
        setVersions(data.versions)
      } else {
        setError('Falha ao carregar historico')
      }
    } catch {
      setError('Erro de rede')
    } finally {
      setLoading(false)
    }
  }, [type, entryId])

  useEffect(() => {
    void load()
  }, [load])

  const restore = async (v: Version) => {
    setConfirmVersion(null)
    const res = await apiClient(`/api/v1/knowledge/${type}/${entryId}/versions/${v.id}/restore`, {
      method: 'POST',
    })
    if (res.ok) {
      setToast(`Restaurado a partir de v${v.version}`)
      await load()
    } else {
      setError(`Falha ao restaurar (${res.status})`)
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Carregando historico...</p>

  if (versions.length === 0) {
    return <p className="text-sm text-gray-500">Nenhuma versao anterior.</p>
  }

  return (
    <section data-testid="version-history" className="space-y-2">
      {toast && <div role="status" className="rounded bg-green-50 p-2 text-sm text-green-800">{toast}</div>}
      {error && <div role="alert" className="rounded bg-red-50 p-2 text-sm text-red-800">{error}</div>}

      <ul className="space-y-2">
        {versions.map((v) => (
          <li key={v.id} className="rounded border p-3 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <strong>v{v.version}</strong>{' '}
                <span className="text-gray-500">
                  {new Date(v.createdAt).toLocaleString('pt-BR')}
                </span>
                {v.createdBy && <span className="ml-2 text-xs text-gray-400">por {v.createdBy}</span>}
              </div>
              <button
                type="button"
                onClick={() => setConfirmVersion(v)}
                className="rounded bg-blue-600 px-2 py-1 text-xs text-white"
              >
                Restaurar
              </button>
            </div>
            {v.changeSummary && (
              <p className="mt-1 text-xs italic text-gray-600">{v.changeSummary}</p>
            )}
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-blue-600">Ver snapshot</summary>
              <pre className="mt-1 max-h-48 overflow-auto rounded bg-gray-50 p-2 text-xs">
                {JSON.stringify(v.snapshot, null, 2)}
              </pre>
            </details>
          </li>
        ))}
      </ul>

      {confirmVersion && (
        <div role="dialog" aria-modal className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded bg-white p-4 shadow-lg">
            <p className="mb-3">
              Restaurar v{confirmVersion.version}? Isso criara uma nova versao aplicando o snapshot.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmVersion(null)}
                className="rounded border px-3 py-1 text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void restore(confirmVersion)}
                className="rounded bg-blue-600 px-3 py-1 text-sm text-white"
              >
                Confirmar restauracao
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
