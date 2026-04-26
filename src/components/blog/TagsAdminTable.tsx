'use client'

// Intake Review TASK-9 ST003 (CL-264) — tabela CRUD do catalogo de tags.
// Edit inline por nome, delete guardada e acao merge.

import { useCallback, useEffect, useState } from 'react'
import { Pencil, Trash2, Combine, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { apiClient } from '@/lib/api-client'
import { TagMergeDialog } from './TagMergeDialog'

export interface TagRow {
  id: string
  name: string
  slug: string
  count: number
}

interface TagsAdminTableProps {
  initialTags?: TagRow[]
}

export function TagsAdminTable({ initialTags }: TagsAdminTableProps) {
  const [tags, setTags] = useState<TagRow[]>(initialTags ?? [])
  const [loading, setLoading] = useState(!initialTags)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<TagRow | null>(null)
  const [mergeSource, setMergeSource] = useState<TagRow | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiClient('/api/v1/blog/tags')
      const data = (await res.json()) as TagRow[]
      setTags(Array.isArray(data) ? data : [])
      setError(null)
    } catch {
      setError('Erro ao carregar tags')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!initialTags) void reload()
  }, [initialTags, reload])

  const startEdit = (tag: TagRow) => {
    setEditingId(tag.id)
    setEditValue(tag.name)
  }

  const commitEdit = async (tag: TagRow) => {
    if (!editValue.trim() || editValue.trim() === tag.name) {
      setEditingId(null)
      return
    }
    try {
      const res = await apiClient(`/api/v1/blog/tags/${tag.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: editValue.trim() }),
      })
      if (!res.ok) throw new Error('fail')
      setEditingId(null)
      await reload()
    } catch {
      setError('Falha ao renomear tag')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      const res = await apiClient(`/api/v1/blog/tags/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(body?.message ?? 'fail')
      }
      setDeleteTarget(null)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao deletar tag')
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Carregando tags...</p>
  if (tags.length === 0)
    return <p className="text-sm text-muted-foreground">Nenhuma tag cadastrada.</p>

  return (
    <div className="space-y-4">
      {error && (
        <div role="alert" className="rounded-md border border-danger/30 bg-danger/5 p-2 text-sm text-danger">
          {error}
        </div>
      )}
      <table className="w-full text-sm" data-testid="tags-admin-table">
        <thead className="text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-2 py-2">Nome</th>
            <th className="px-2 py-2">Slug</th>
            <th className="px-2 py-2">Artigos</th>
            <th className="px-2 py-2 text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {tags.map((tag) => (
            <tr key={tag.id} className="border-t border-border">
              <td className="px-2 py-2">
                {editingId === tag.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="rounded-md border border-border bg-background px-2 py-1 text-sm"
                      aria-label="Novo nome da tag"
                    />
                    <Button size="icon" variant="ghost" onClick={() => commitEdit(tag)} aria-label="Salvar">
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                      aria-label="Cancelar"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  tag.name
                )}
              </td>
              <td className="px-2 py-2 text-muted-foreground">{tag.slug}</td>
              <td className="px-2 py-2">{tag.count}</td>
              <td className="px-2 py-2 text-right">
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(tag)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setMergeSource(tag)}>
                    <Combine className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteTarget(tag)}
                    className="text-danger hover:bg-danger/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Deletar tag"
        description={
          deleteTarget
            ? `Tem certeza? A tag "${deleteTarget.name}" será removida do catalogo. Artigos em uso bloqueiam o delete.`
            : ''
        }
        confirmLabel="Deletar"
        variant="destructive"
      />

      {mergeSource && (
        <TagMergeDialog
          source={mergeSource}
          tags={tags.filter((t) => t.id !== mergeSource.id)}
          open
          onClose={() => setMergeSource(null)}
          onMerged={() => {
            setMergeSource(null)
            void reload()
          }}
        />
      )}
    </div>
  )
}
