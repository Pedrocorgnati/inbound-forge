'use client'

import { useEffect, useState, useCallback } from 'react'
import { apiClient } from '@/lib/api-client'

type Locale = 'pt-BR' | 'en-US' | 'it-IT' | 'es-ES'
const LOCALES: Locale[] = ['en-US', 'it-IT', 'es-ES']

type TranslationStatus = 'DRAFT' | 'APPROVED' | 'REJECTED'

type Translation = {
  id: string
  locale: Locale
  title: string
  slug: string
  contentMd: string
  status: TranslationStatus
  costUsd: number | null
  tokensUsed: number | null
}

export function TranslationPanel({ articleId }: { articleId: string }) {
  const [translations, setTranslations] = useState<Record<Locale, Translation | null>>(
    { 'pt-BR': null, 'en-US': null, 'it-IT': null, 'es-ES': null }
  )
  const [loading, setLoading] = useState<Record<Locale, boolean>>({
    'pt-BR': false,
    'en-US': false,
    'it-IT': false,
    'es-ES': false,
  })
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    try {
      const res = await apiClient(`/api/v1/blog/${articleId}/translations`)
      if (res.ok) {
        const data = (await res.json()) as { translations: Translation[] }
        const map: Record<Locale, Translation | null> = {
          'pt-BR': null,
          'en-US': null,
          'it-IT': null,
          'es-ES': null,
        }
        for (const t of data.translations) map[t.locale] = t
        setTranslations(map)
      }
    } catch {
      // silent
    }
  }, [articleId])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const runTranslation = async (locale: Locale) => {
    setLoading((s) => ({ ...s, [locale]: true }))
    setError(null)
    try {
      const res = await apiClient(`/api/v1/blog/${articleId}/translate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ locales: [locale] }),
      })
      if (res.status === 402) {
        setError('Orcamento diario de traducao excedido.')
        return
      }
      if (!res.ok && res.status !== 207) {
        setError(`Falha ao traduzir (${res.status})`)
        return
      }
      setToast(`Traducao gerada para ${locale}`)
      await loadAll()
    } catch {
      setError('Falha de rede ao traduzir')
    } finally {
      setLoading((s) => ({ ...s, [locale]: false }))
    }
  }

  const updateStatus = async (locale: Locale, status: 'APPROVED' | 'REJECTED', reason?: string) => {
    const res = await apiClient(`/api/v1/blog/${articleId}/translations/${locale}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status, rejectionReason: reason }),
    })
    if (res.ok) {
      setToast(status === 'APPROVED' ? `Publicado em ${locale}` : `Rejeitado em ${locale}`)
      await loadAll()
    } else {
      setError(`Falha ao atualizar status (${res.status})`)
    }
  }

  return (
    <section className="space-y-4" data-testid="translation-panel">
      {toast && (
        <div role="status" className="rounded bg-green-50 p-3 text-sm text-green-800">
          {toast}
        </div>
      )}
      {error && (
        <div role="alert" className="rounded bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {LOCALES.map((locale) => {
        const t = translations[locale]
        const isLoading = loading[locale]
        return (
          <article key={locale} className="rounded border p-4">
            <header className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold">{locale}</h3>
              <StatusBadge status={t?.status ?? null} />
            </header>

            {!t && (
              <p className="text-sm text-gray-600">Nenhuma traducao gerada ainda.</p>
            )}

            {t && (
              <div className="space-y-2 text-sm">
                <div><strong>Titulo:</strong> {t.title}</div>
                <div><strong>Slug:</strong> {t.slug}</div>
                {t.costUsd !== null && (
                  <div className="text-xs text-gray-500">
                    Custo: ${t.costUsd.toFixed(4)} · Tokens: {t.tokensUsed}
                  </div>
                )}
                <details>
                  <summary className="cursor-pointer text-blue-600">Ver conteudo</summary>
                  <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap rounded bg-gray-50 p-2">
                    {t.contentMd}
                  </pre>
                </details>
              </div>
            )}

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => void runTranslation(locale)}
                disabled={isLoading}
                className="rounded bg-blue-600 px-3 py-1 text-sm text-white disabled:opacity-50"
                data-testid={`translate-${locale}`}
              >
                {isLoading ? 'Traduzindo...' : t ? 'Re-gerar' : 'Gerar traducao'}
              </button>
              {t && t.status === 'DRAFT' && (
                <>
                  <button
                    type="button"
                    onClick={() => void updateStatus(locale, 'APPROVED')}
                    className="rounded bg-green-600 px-3 py-1 text-sm text-white"
                  >
                    Aprovar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const reason = window.prompt('Motivo da rejeicao (opcional):') || undefined
                      void updateStatus(locale, 'REJECTED', reason)
                    }}
                    className="rounded bg-red-600 px-3 py-1 text-sm text-white"
                  >
                    Rejeitar
                  </button>
                </>
              )}
            </div>
          </article>
        )
      })}
    </section>
  )
}

function StatusBadge({ status }: { status: TranslationStatus | null }) {
  if (!status) return <span className="text-xs text-gray-400">Sem traducao</span>
  const styles: Record<TranslationStatus, string> = {
    DRAFT: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
  }
  return (
    <span className={`rounded px-2 py-0.5 text-xs ${styles[status]}`} aria-label={`Status: ${status}`}>
      {status}
    </span>
  )
}
