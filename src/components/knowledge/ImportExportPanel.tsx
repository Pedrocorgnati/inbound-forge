'use client'

import { useState } from 'react'
import { apiClient } from '@/lib/api-client'

type Strategy = 'skip' | 'merge' | 'replace'

type ImportStats = {
  cases: { created: number; skipped: number; replaced: number }
  pains: { created: number; skipped: number; replaced: number }
  patterns: { created: number; skipped: number; replaced: number }
  objections: { created: number; skipped: number; replaced: number }
}

export function ImportExportPanel() {
  const [strategy, setStrategy] = useState<Strategy>('skip')
  const [uploading, setUploading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<ImportStats | null>(null)

  const exportJson = async () => {
    setDownloading(true)
    setError(null)
    try {
      const res = await apiClient('/api/v1/knowledge/export?format=json')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `knowledge-base-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setToast('Export JSON gerado')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no export')
    } finally {
      setDownloading(false)
    }
  }

  const exportCsv = async () => {
    setDownloading(true)
    setError(null)
    try {
      const res = await apiClient('/api/v1/knowledge/export?format=csv')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `knowledge-base-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setToast('Export CSV gerado')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no export')
    } finally {
      setDownloading(false)
    }
  }

  const onFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    setStats(null)
    try {
      const text = await file.text()
      const payload = JSON.parse(text)
      const res = await apiClient(`/api/v1/knowledge/import?strategy=${strategy}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Falha no import')
        return
      }
      setStats(data.stats as ImportStats)
      setToast(`Import concluido (${strategy})`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'JSON invalido')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  return (
    <section className="space-y-4" data-testid="import-export-panel">
      {toast && <div role="status" className="rounded bg-green-50 p-3 text-sm text-green-800">{toast}</div>}
      {error && <div role="alert" className="rounded bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <div>
        <h3 className="mb-2 font-semibold">Exportar</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportJson}
            disabled={downloading}
            className="rounded bg-blue-600 px-3 py-1 text-sm text-white disabled:opacity-50"
          >
            {downloading ? 'Gerando...' : 'Baixar JSON'}
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={downloading}
            className="rounded bg-blue-600 px-3 py-1 text-sm text-white disabled:opacity-50"
          >
            Baixar CSV
          </button>
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-semibold">Importar</h3>
        <label htmlFor="strategy" className="mb-1 block text-sm">
          Estrategia de colisao
        </label>
        <select
          id="strategy"
          value={strategy}
          onChange={(e) => setStrategy(e.target.value as Strategy)}
          className="mb-2 rounded border px-2 py-1 text-sm"
        >
          <option value="skip">skip — preserva existentes</option>
          <option value="merge">merge — atualiza campos</option>
          <option value="replace">replace — sobrescreve</option>
        </select>
        <input
          type="file"
          accept="application/json"
          onChange={onFileUpload}
          disabled={uploading}
          data-testid="import-file-input"
        />
        {uploading && <p className="text-sm text-gray-500">Importando...</p>}
      </div>

      {stats && (
        <div className="rounded border bg-gray-50 p-3 text-sm">
          <strong>Resultado:</strong>
          <ul className="mt-1 space-y-1">
            {(['cases', 'pains', 'patterns', 'objections'] as const).map((k) => (
              <li key={k}>
                {k}: +{stats[k].created} novos · {stats[k].skipped} pulados · {stats[k].replaced} atualizados
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
