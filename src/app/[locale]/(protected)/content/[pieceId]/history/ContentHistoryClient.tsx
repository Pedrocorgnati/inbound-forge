'use client'

import { useEffect, useMemo, useState } from 'react'
import { VersionDiffViewer } from '@/components/content/VersionDiffViewer'

type Version = {
  id: string
  version?: number | null
  body?: string | null
  author?: string | null
  createdAt?: string | null
  generationVersion?: number | null
}

export default function ContentHistoryClient({ pieceId }: { pieceId: string }) {
  const [versions, setVersions] = useState<Version[]>([])
  const [aId, setAId] = useState<string>('')
  const [bId, setBId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/v1/content/${pieceId}/history`)
      .then(async (r) => {
        const json = await r.json()
        if (!r.ok) throw new Error(json?.error ?? 'Falha ao carregar historico')
        return (json.data ?? []) as Version[]
      })
      .then((data) => {
        if (cancelled) return
        setVersions(data)
        if (data.length >= 2) {
          setAId(data[1]!.id)
          setBId(data[0]!.id)
        } else if (data.length === 1) {
          setAId(data[0]!.id)
          setBId(data[0]!.id)
        }
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : 'Erro'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [pieceId])

  const versionA = useMemo(() => versions.find((v) => v.id === aId), [versions, aId])
  const versionB = useMemo(() => versions.find((v) => v.id === bId), [versions, bId])

  return (
    <section className="space-y-4" data-testid="content-history">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Historico da peca</h1>
        <p className="text-xs text-muted-foreground">
          Selecione duas versoes para comparar. Destacado: adicionado / removido.
        </p>
      </header>

      {loading && <p className="text-xs text-muted-foreground">Carregando...</p>}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}

      {!loading && versions.length === 0 && (
        <p className="text-xs text-muted-foreground">Nenhuma versao registrada.</p>
      )}

      {versions.length > 0 && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col text-xs">
            De versao
            <select
              value={aId}
              onChange={(e) => setAId(e.target.value)}
              className="rounded border bg-background px-2 py-1 text-sm"
              data-testid="version-select-a"
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.version ?? '?'} — {v.createdAt ? new Date(v.createdAt).toLocaleString() : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-xs">
            Para versao
            <select
              value={bId}
              onChange={(e) => setBId(e.target.value)}
              className="rounded border bg-background px-2 py-1 text-sm"
              data-testid="version-select-b"
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.version ?? '?'} — {v.createdAt ? new Date(v.createdAt).toLocaleString() : ''}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {versionA && versionB && <VersionDiffViewer versionA={versionA} versionB={versionB} />}
    </section>
  )
}
