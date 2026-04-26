'use client'

/**
 * TranslationWorkflow — Intake Review TASK-13 ST003 (CL-165..168).
 *
 * MVP kanban de 3 colunas (DRAFT / APPROVED / REJECTED) — o schema atual de
 * TranslationStatus nao possui IN_REVIEW nem PUBLISHED (ressalva documentada em
 * INTAKE-REVIEW-PROGRESS.md). Transicao de status feita via dropdown por item em
 * vez de drag-and-drop (MVP); drag pode ser adicionado em iteracao futura.
 */
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

type TranslationStatus = 'DRAFT' | 'APPROVED' | 'REJECTED'

export interface TranslationItem {
  id: string
  locale: string
  title: string
  slug: string
  status: TranslationStatus
  updatedAt?: string
}

interface Props {
  slug: string
  initialTranslations: TranslationItem[]
  availableLocales?: string[]
}

const COLUMNS: Array<{ key: TranslationStatus; label: string }> = [
  { key: 'DRAFT', label: 'Draft' },
  { key: 'APPROVED', label: 'Aprovado' },
  { key: 'REJECTED', label: 'Rejeitado' },
]

const DEFAULT_LOCALES = ['en-US', 'it-IT', 'es-ES']

export function TranslationWorkflow({ slug, initialTranslations, availableLocales = DEFAULT_LOCALES }: Props) {
  const [items, setItems] = useState<TranslationItem[]>(initialTranslations)
  const [generating, setGenerating] = useState(false)

  const byStatus = useMemo(() => {
    const m: Record<TranslationStatus, TranslationItem[]> = { DRAFT: [], APPROVED: [], REJECTED: [] }
    items.forEach((i) => { m[i.status].push(i) })
    return m
  }, [items])

  async function handleGenerate() {
    setGenerating(true)
    try {
      const existingLocales = new Set(items.map((i) => i.locale))
      const toGenerate = availableLocales.filter((l) => !existingLocales.has(l))
      if (toGenerate.length === 0) {
        toast.info('Todas as traducoes ja existem. Use "Recriar" por item para sobrescrever.')
        return
      }
      const res = await fetch(`/api/v1/blog-articles/${slug}/translate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ locales: toGenerate }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const payload = await res.json()
      const results = payload?.data?.results ?? []
      const ok = results.filter((r: { status: string }) => r.status === 'DRAFT').length
      toast.success(`${ok} traducoes criadas em status DRAFT.`)
      // reload page-local state by refetch (optimistic: mark as DRAFT placeholders)
      setItems((prev) => [
        ...prev,
        ...results
          .filter((r: { status: string }) => r.status === 'DRAFT')
          .map((r: { locale: string; translationId?: string }) => ({
            id: r.translationId ?? `tmp-${r.locale}`,
            locale: r.locale,
            title: '(gerando...)',
            slug: '',
            status: 'DRAFT' as const,
          })),
      ])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao gerar traducoes.')
    } finally {
      setGenerating(false)
    }
  }

  async function updateStatus(id: string, next: TranslationStatus) {
    const prevItems = items
    setItems((cur) => cur.map((i) => (i.id === id ? { ...i, status: next } : i)))
    try {
      const res = await fetch(`/api/v1/blog-articles/translations/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success(`Status atualizado para ${next}.`)
    } catch (err) {
      setItems(prevItems)
      toast.error(err instanceof Error ? err.message : 'Falha ao atualizar status.')
    }
  }

  return (
    <div className="space-y-4" data-testid="translation-workflow">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Workflow de traducoes</h2>
        <button
          type="button"
          disabled={generating}
          onClick={handleGenerate}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {generating ? 'Gerando...' : 'Gerar traducoes faltantes'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => (
          <section
            key={col.key}
            aria-label={`Coluna ${col.label}`}
            className="rounded-md border border-border bg-surface p-3"
          >
            <header className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{col.label}</h3>
              <span className="text-xs text-muted-foreground">{byStatus[col.key].length}</span>
            </header>
            <ul className="space-y-2">
              {byStatus[col.key].map((item) => (
                <li
                  key={item.id}
                  className="rounded-md border border-border bg-background p-2 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs uppercase text-muted-foreground">
                      {item.locale}
                    </span>
                    <select
                      value={item.status}
                      onChange={(e) => updateStatus(item.id, e.target.value as TranslationStatus)}
                      aria-label={`Status de ${item.locale}`}
                      className="rounded border border-border bg-background px-1 py-0.5 text-xs"
                    >
                      {COLUMNS.map((c) => (
                        <option key={c.key} value={c.key}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs">{item.title}</p>
                </li>
              ))}
              {byStatus[col.key].length === 0 && (
                <li className="rounded-md border border-dashed border-border px-2 py-4 text-center text-xs text-muted-foreground">
                  Vazio
                </li>
              )}
            </ul>
          </section>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Ressalva MVP: transicao via dropdown em vez de drag-and-drop; colunas
        IN_REVIEW/PUBLISHED requerem extensao do enum TranslationStatus.
      </p>
    </div>
  )
}
