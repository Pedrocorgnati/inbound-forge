'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ImageTemplateForm } from '@/components/admin/ImageTemplateForm'

type Template = {
  id: string
  name: string
  imageType: string
  templateType?: string | null
  channel: string
  width: number
  height: number
  isActive: boolean
  description?: string | null
}

export default function ImageTemplatesAdminClient() {
  const [items, setItems] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Template | 'new' | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/image-templates')
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? 'Falha ao carregar')
      setItems((json.data ?? json.items ?? []) as Template[])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function remove(id: string) {
    if (!confirm('Remover template?')) return
    const res = await fetch(`/api/image-templates/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      toast.error(json?.error ?? `Falha (${res.status})`)
      return
    }
    toast.success('Template removido')
    void load()
  }

  return (
    <section className="space-y-4" data-testid="image-templates-admin">
      <header className="flex items-center justify-between border-b pb-3">
        <div>
          <h1 className="text-2xl font-semibold">Image Templates</h1>
          <p className="text-xs text-muted-foreground">
            Gerencie os templates usados pelo worker de imagem (Satori).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="rounded border bg-primary px-3 py-1 text-sm text-primary-foreground hover:bg-primary/90"
          data-testid="image-template-new"
        >
          Novo template
        </button>
      </header>

      {loading && <p className="text-xs text-muted-foreground">Carregando...</p>}

      {!loading && items.length === 0 && (
        <p className="text-xs text-muted-foreground">Nenhum template cadastrado.</p>
      )}

      {items.length > 0 && (
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-2 py-1">Nome</th>
              <th className="px-2 py-1">Canal</th>
              <th className="px-2 py-1">Tipo</th>
              <th className="px-2 py-1">Dimensoes</th>
              <th className="px-2 py-1">Ativo</th>
              <th className="px-2 py-1"> </th>
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="px-2 py-1 font-medium">{t.name}</td>
                <td className="px-2 py-1">{t.channel}</td>
                <td className="px-2 py-1">{t.imageType}</td>
                <td className="px-2 py-1 tabular-nums">
                  {t.width}x{t.height}
                </td>
                <td className="px-2 py-1">{t.isActive ? 'Sim' : 'Nao'}</td>
                <td className="px-2 py-1 space-x-2 text-right">
                  <button
                    type="button"
                    onClick={() => setEditing(t)}
                    className="rounded border px-2 py-1 text-xs hover:bg-muted/40"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(t.id)}
                    className="rounded border px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                  >
                    Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && (
        <ImageTemplateForm
          template={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            void load()
          }}
        />
      )}
    </section>
  )
}
