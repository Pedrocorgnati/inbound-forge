'use client'

/**
 * TASK-5 ST003 (CL-AU-016): botao que baixa bundle LGPD do usuario.
 * Trata rate-limit 429 exibindo retry-after em minutos.
 */
import { useState } from 'react'
import { toast } from 'sonner'

export function ExportMyDataButton() {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/me/export')
      if (res.status === 429) {
        const payload = (await res.json().catch(() => ({}))) as {
          retryAfterSeconds?: number
        }
        const minutes = Math.ceil((payload.retryAfterSeconds ?? 3600) / 60)
        toast.error(`Limite: aguarde ${minutes} min para novo export.`)
        return
      }
      if (!res.ok) {
        throw new Error(`Falha (${res.status})`)
      }
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const match = disposition.match(/filename="([^"]+)"/)
      const filename = match?.[1] ?? `export-${Date.now()}.json`

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Export concluido.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao exportar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
      data-testid="export-my-data"
    >
      {loading ? 'Gerando export...' : 'Exportar meus dados (LGPD)'}
    </button>
  )
}
