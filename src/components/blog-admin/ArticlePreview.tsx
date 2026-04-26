'use client'

// ArticlePreview — iframe da rota publica com token temporario + banner (TASK-9 ST003 / CL-237)

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'

type Props = {
  articleId: string
  locale: string
  slug: string
  onBack?: () => void
}

export function ArticlePreview({ articleId, locale, slug, onBack }: Props) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function mint() {
      try {
        const res = await apiClient(`/api/v1/blog/${articleId}/preview`, { method: 'POST' })
        const data = (await res.json().catch(() => ({}))) as { url?: string; message?: string }
        if (!res.ok || !data.url) {
          setError(data.message ?? `HTTP ${res.status}`)
          return
        }
        if (!cancelled) setUrl(data.url)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'erro')
      }
    }
    void mint()
    return () => {
      cancelled = true
    }
  }, [articleId])

  const copyUrl = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-3 rounded border-b bg-amber-50 p-3 text-sm text-amber-900">
        <span>
          <strong>Pre-visualizacao — nao publicado.</strong> Token expira em 15 min.
          {locale} / {slug}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void copyUrl()}
            disabled={!url}
            className="rounded border bg-white px-3 py-1 text-xs disabled:opacity-50"
            data-testid="preview-copy-link"
          >
            {copied ? 'Copiado!' : 'Copiar link de preview'}
          </button>
          {onBack && (
            <button type="button" onClick={onBack} className="rounded border bg-white px-3 py-1 text-xs">
              Sair do preview
            </button>
          )}
        </div>
      </header>

      {error && (
        <div role="alert" className="bg-red-50 p-4 text-sm text-red-800">
          Falha ao gerar preview: {error}
        </div>
      )}

      {url && (
        <iframe
          src={url}
          title={`Preview — ${slug}`}
          className="h-full min-h-[70vh] w-full flex-1 border-0"
          sandbox="allow-same-origin allow-scripts allow-popups"
        />
      )}
    </div>
  )
}
